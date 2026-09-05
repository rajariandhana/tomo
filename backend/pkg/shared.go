package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"google.golang.org/genai"
)

// ── Types ────────────────────────────────────────────────────────────────────

type StartReq struct {
	TopicKey string `json:"topic_key"`
}

type StartResp struct {
	FirstMessageJa string `json:"first_message_ja"`
	FirstMessageEn string `json:"first_message_en"`
}

// HistoryItem mirrors one completed turn (role = "user" | "model", content in Japanese)
type HistoryItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type SendReq struct {
	TopicKey string        `json:"topic_key"`
	Message  string        `json:"message"`
	History  []HistoryItem `json:"history"`
}

type SendResp struct {
	ReplyJa string `json:"reply_ja"`
	ReplyEn string `json:"reply_en"`
}

type AIReply struct {
	JA string `json:"ja"`
	EN string `json:"en"`
}

// ── Gemini client (initialized once per cold start) ──────────────────────────

var (
	GeminiClient *genai.Client
	GeminiModel  string
	geminiOnce   sync.Once
)

// InitGemini initializes the Gemini client from environment variables.
// Safe to call multiple times; executes only once. Call it from main()
// after loading .env so env vars are visible — package init() runs too early.
func InitGemini() {
	geminiOnce.Do(func() {
		GeminiModel = os.Getenv("GEMINI_MODEL")
		if GeminiModel == "" {
			GeminiModel = "gemini-3.6-flash"
		}

		apiKey := os.Getenv("GEMINI_API_KEY")
		if apiKey == "" {
			log.Println("warning: GEMINI_API_KEY is not set")
			return
		}

		var err error
		GeminiClient, err = genai.NewClient(context.Background(), &genai.ClientConfig{
			APIKey:  apiKey,
			Backend: genai.BackendGeminiAPI,
		})
		if err != nil {
			log.Printf("gemini client init: %v", err)
		}
	})
}

// ── System prompts ───────────────────────────────────────────────────────────

var topicLabels = map[string]string{
	"self_introduction": "self-introduction",
	"hometown":          "hometowns",
	"food":              "food and cuisine",
	"hobbies":           "hobbies and interests",
	"travel":            "travel and places",
	"pop_culture":       "anime, movies, and pop culture",
}

func BuildSystemPrompt(topicKey string) string {
	label := topicLabels[topicKey]
	if label == "" {
		label = "everyday life"
	}
	return fmt.Sprintf(`You are Tomo, a friendly and encouraging Japanese language tutor. You help English speakers practice conversational Japanese by chatting about %s.

Rules:
- Always respond with ONLY a valid JSON object, no extra text: {"ja": "...", "en": "..."}
- "ja" is your reply in natural, conversational Japanese
- "en" is the English translation of your Japanese reply
- Keep replies short (1–3 sentences) and conversational
- Be warm, patient, and encouraging
- When you receive "[START]", greet the user and open the conversation with a question about the topic
- Do not include any text outside the JSON object`, label)
}

func BuildStreamPrompt(topicKey string) string {
	label := topicLabels[topicKey]
	if label == "" {
		label = "everyday life"
	}
	return fmt.Sprintf(`You are Tomo, a friendly and encouraging Japanese language tutor. You help English speakers practice conversational Japanese by chatting about %s.

Rules:
- Write your reply in natural, conversational Japanese (1–3 sentences)
- Then write exactly "---" on its own line
- Then write the English translation of your Japanese reply
- Be warm, patient, and encouraging
- Do not include any other text or labels

Example format:
こんにちは！お元気ですか？
---
Hello! How are you?`, label)
}

// ── Gemini call ──────────────────────────────────────────────────────────────

func CallGemini(ctx context.Context, topicKey, userText string, history []HistoryItem) (AIReply, error) {
	if GeminiClient == nil {
		return AIReply{}, fmt.Errorf("gemini client not initialized")
	}

	contents := make([]*genai.Content, 0, len(history)+1)
	for _, h := range history {
		contents = append(contents, &genai.Content{
			Role:  h.Role,
			Parts: []*genai.Part{{Text: h.Content}},
		})
	}
	contents = append(contents, &genai.Content{
		Role:  "user",
		Parts: []*genai.Part{{Text: userText}},
	})

	thinkingBudget := int32(0)
	resp, err := GeminiClient.Models.GenerateContent(ctx, GeminiModel, contents, &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: BuildSystemPrompt(topicKey)}},
		},
		ResponseMIMEType: "application/json",
		MaxOutputTokens:  200,
		ThinkingConfig:   &genai.ThinkingConfig{ThinkingBudget: &thinkingBudget},
	})
	if err != nil {
		return AIReply{}, fmt.Errorf("gemini: %w", err)
	}

	raw := strings.TrimSpace(resp.Text())
	var reply AIReply
	if err := json.Unmarshal([]byte(raw), &reply); err != nil {
		return AIReply{}, fmt.Errorf("gemini returned non-JSON: %s", raw)
	}
	return reply, nil
}

// ── Gemini streaming call ────────────────────────────────────────────────────

func HandleSendStream(w http.ResponseWriter, r *http.Request) {
	InitGemini()
	var req SendReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		http.Error(w, "message is empty", http.StatusBadRequest)
		return
	}
	if GeminiClient == nil {
		http.Error(w, "gemini not configured", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	contents := make([]*genai.Content, 0, len(req.History)+1)
	for _, h := range req.History {
		contents = append(contents, &genai.Content{
			Role:  h.Role,
			Parts: []*genai.Part{{Text: h.Content}},
		})
	}
	contents = append(contents, &genai.Content{
		Role:  "user",
		Parts: []*genai.Part{{Text: req.Message}},
	})

	thinkingBudget := int32(0)
	stream := GeminiClient.Models.GenerateContentStream(r.Context(), GeminiModel, contents, &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: BuildStreamPrompt(req.TopicKey)}},
		},
		MaxOutputTokens: 200,
		ThinkingConfig:  &genai.ThinkingConfig{ThinkingBudget: &thinkingBudget},
	})

	writeSSE := func(v any) {
		b, _ := json.Marshal(v)
		fmt.Fprintf(w, "data: %s\n\n", b)
		flusher.Flush()
	}

	const delimiter = "\n---\n"
	const safeBuffer = len(delimiter) // 5: never send chars that might be mid-delimiter

	var acc strings.Builder
	delimFound := false
	jaSent := 0

	for resp, err := range stream {
		if err != nil {
			log.Printf("stream error: %v", err)
			writeSSE(map[string]bool{"error": true})
			return
		}
		acc.WriteString(resp.Text())
		full := acc.String()

		if delimFound {
			continue
		}

		idx := strings.Index(full, delimiter)
		if idx >= 0 {
			delimFound = true
			if idx > jaSent {
				writeSSE(map[string]string{"chunk": full[jaSent:idx]})
			}
		} else {
			safeEnd := len(full) - safeBuffer
			if safeEnd > jaSent {
				writeSSE(map[string]string{"chunk": full[jaSent:safeEnd]})
				jaSent = safeEnd
			}
		}
	}

	full := acc.String()
	parts := strings.SplitN(full, delimiter, 2)
	ja := strings.TrimSpace(parts[0])
	en := ""
	if len(parts) == 2 {
		en = strings.TrimSpace(parts[1])
	}

	// send any leftover ja if delimiter never arrived (model misbehaved)
	if !delimFound && len(ja) > jaSent {
		writeSSE(map[string]string{"chunk": ja[jaSent:]})
	}

	writeSSE(map[string]any{"done": true, "ja": ja, "en": en})
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

func SetCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
}

func WriteJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: %v", err)
	}
}

// ── Handlers ─────────────────────────────────────────────────────────────────

func HandleStart(w http.ResponseWriter, r *http.Request) {
	InitGemini()
	var req StartReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	reply, err := CallGemini(r.Context(), req.TopicKey, "[START]", nil)
	if err != nil {
		log.Printf("start error: %v", err)
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}

	WriteJSON(w, StartResp{FirstMessageJa: reply.JA, FirstMessageEn: reply.EN})
}

func HandleSend(w http.ResponseWriter, r *http.Request) {
	InitGemini()
	var req SendReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		http.Error(w, "message is empty", http.StatusBadRequest)
		return
	}

	reply, err := CallGemini(r.Context(), req.TopicKey, req.Message, req.History)
	if err != nil {
		log.Printf("send error: %v", err)
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}

	WriteJSON(w, SendResp{ReplyJa: reply.JA, ReplyEn: reply.EN})
}
