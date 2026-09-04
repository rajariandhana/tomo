package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

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
)

func init() {
	GeminiModel = os.Getenv("GEMINI_MODEL")
	if GeminiModel == "" {
		GeminiModel = "gemini-2.0-flash"
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
}

// ── System prompt ────────────────────────────────────────────────────────────

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

	resp, err := GeminiClient.Models.GenerateContent(ctx, GeminiModel, contents, &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: BuildSystemPrompt(topicKey)}},
		},
		ResponseMIMEType: "application/json",
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
