package pkg

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"iter"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

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

type TTSReq struct {
	Text string `json:"text"`
}

// ── Gemini rotator ───────────────────────────────────────────────────────────

// Rotation order: cycle through all models of project 1, then project 2, etc.
// Each request advances the slot by one, wrapping around after all slots are exhausted.

var geminiModels = []string{
	"gemini-3.8-flash",
	"gemini-3.7-flash",
	"gemini-3.6-flash",
	"gemini-3.5-flash",
	"gemini-3.5-flash-lite",
	"gemini-3.1-flash-lite",
}

var geminiProjectEnvKeys = []string{
	"BOT_1_TOMO",
	"BOT_2_TOMO",
	"BOT_3_TOMO",
	"BOT_4_TOMO",
}

// nonThinkingModels don't accept ThinkingConfig — sending it returns INVALID_ARGUMENT.
var nonThinkingModels = map[string]bool{
	"gemini-3.6-flash":      true,
	"gemini-3.5-flash-lite": true,
}

type clientSlot struct {
	client        *genai.Client
	model         string
	supportsThink bool
}

type rotator struct {
	slots   []clientSlot
	counter atomic.Uint64
}

// next returns the client, model, and whether ThinkingConfig is supported for this slot.
func (r *rotator) next() (*genai.Client, string, bool) {
	n := r.counter.Add(1) - 1
	s := r.slots[n%uint64(len(r.slots))]
	return s.client, s.model, s.supportsThink
}

// slotCount returns how many slots are available to retry across.
func (r *rotator) slotCount() int {
	return len(r.slots)
}

// errAllModelsUnavailable is returned when every model in the rotation failed
// with a retriable error (e.g. all under high demand).
var errAllModelsUnavailable = errors.New("all gemini models unavailable")

// maxUserTurns caps a free conversation at 5 user messages (5 user/AI
// exchanges); the client enforces this in the UI, this is the server-side
// backstop so it can't be bypassed by calling the API directly.
const maxUserTurns = 5

func countUserTurns(history []HistoryItem) int {
	n := 0
	for _, h := range history {
		if h.Role == "user" {
			n++
		}
	}
	return n
}

// isRetriable reports whether a Gemini API error is transient and worth
// retrying against a different model/project (high demand, rate limits, or
// other server-side unavailability). Non-retriable errors (bad request,
// malformed output) are surfaced immediately instead of burning through slots.
func isRetriable(err error) bool {
	s := err.Error()
	return strings.Contains(s, "503") ||
		strings.Contains(s, "429") ||
		strings.Contains(s, "UNAVAILABLE") ||
		strings.Contains(s, "RESOURCE_EXHAUSTED") ||
		strings.Contains(s, "INTERNAL")
}

// ttsRotator cycles through one Gemini client per configured project. Unlike
// GeminiRotator, TTS always targets a single dedicated TTS model, so there's
// no need to multiply slots per chat model.
type ttsRotator struct {
	clients []*genai.Client
	counter atomic.Uint64
}

func (r *ttsRotator) next() *genai.Client {
	n := r.counter.Add(1) - 1
	return r.clients[n%uint64(len(r.clients))]
}

func (r *ttsRotator) clientCount() int {
	return len(r.clients)
}

var (
	GeminiRotator *rotator
	TTSRotator    *ttsRotator
	rotatorOnce   sync.Once
)

// InitGemini initializes the Gemini rotator from BOT_1_TOMO..BOT_4_TOMO env vars.
// Safe to call multiple times; executes only once. Call from main() after loading .env.
func InitGemini() {
	rotatorOnce.Do(func() {
		r := &rotator{}
		tr := &ttsRotator{}
		for _, key := range geminiProjectEnvKeys {
			apiKey := os.Getenv(key)
			if apiKey == "" {
				log.Printf("warning: %s is not set, skipping", key)
				continue
			}
			client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
				APIKey:  apiKey,
				Backend: genai.BackendGeminiAPI,
			})
			if err != nil {
				log.Printf("gemini client init (%s): %v", key, err)
				continue
			}
			for _, model := range geminiModels {
				r.slots = append(r.slots, clientSlot{client, model, !nonThinkingModels[model]})
			}
			tr.clients = append(tr.clients, client)
		}
		if len(r.slots) == 0 {
			log.Println("warning: no Gemini clients initialized")
			return
		}
		GeminiRotator = r
		log.Printf("gemini rotator ready: %d slot(s) across %d project(s)", len(r.slots), len(r.slots)/len(geminiModels))
		if len(tr.clients) > 0 {
			TTSRotator = tr
			log.Printf("gemini tts rotator ready: %d project(s)", len(tr.clients))
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
- Keep the conversation going: always end your reply with a natural follow-up question, especially if the user's message feels short, final, or like the topic is winding down
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
- Keep the conversation going: always end your reply with a natural follow-up question, especially if the user's message feels short, final, or like the topic is winding down
- Do not include any other text or labels

Example format:
こんにちは！お元気ですか？
---
Hello! How are you?`, label)
}

// ── Gemini call ──────────────────────────────────────────────────────────────

func callGeminiOnce(ctx context.Context, client *genai.Client, model string, supportsThink bool, topicKey, userText string, history []HistoryItem) (AIReply, error) {
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

	cfg := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: BuildSystemPrompt(topicKey)}},
		},
		ResponseMIMEType: "application/json",
		MaxOutputTokens:  512,
	}
	if supportsThink {
		budget := int32(0)
		cfg.ThinkingConfig = &genai.ThinkingConfig{ThinkingBudget: &budget}
	}
	resp, err := client.Models.GenerateContent(ctx, model, contents, cfg)
	if err != nil {
		return AIReply{}, fmt.Errorf("gemini: %w", err)
	}
	if u := resp.UsageMetadata; u != nil {
		log.Printf("[gemini] model=%s in=%d out=%d tokens", model, u.PromptTokenCount, u.CandidatesTokenCount)
	}

	raw := strings.TrimSpace(resp.Text())
	var reply AIReply
	if err := json.Unmarshal([]byte(raw), &reply); err != nil {
		return AIReply{}, fmt.Errorf("gemini returned non-JSON: %s", raw)
	}
	return reply, nil
}

// CallGemini tries the next model in rotation; on a retriable failure (high
// demand, rate limit) it advances to the next slot and tries again, up to
// once per available slot, before giving up with errAllModelsUnavailable.
func CallGemini(ctx context.Context, topicKey, userText string, history []HistoryItem) (AIReply, error) {
	if GeminiRotator == nil {
		return AIReply{}, fmt.Errorf("gemini client not initialized")
	}

	maxAttempts := GeminiRotator.slotCount()
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		client, model, supportsThink := GeminiRotator.next()
		reply, err := callGeminiOnce(ctx, client, model, supportsThink, topicKey, userText, history)
		if err == nil {
			return reply, nil
		}
		if !isRetriable(err) {
			return AIReply{}, err
		}
		log.Printf("[gemini] attempt %d/%d (model=%s) failed: %v — trying next model", attempt, maxAttempts, model, err)
		lastErr = err
	}
	return AIReply{}, fmt.Errorf("%w: %v", errAllModelsUnavailable, lastErr)
}

// ── Gemini TTS call ──────────────────────────────────────────────────────────

const (
	ttsModel     = "gemini-2.5-flash-preview-tts"
	ttsVoiceName = "Kore"
	maxTTSChars  = 1000
)

var ttsSampleRateRe = regexp.MustCompile(`rate=(\d+)`)

func callGeminiTTSOnce(ctx context.Context, client *genai.Client, text string) ([]byte, string, error) {
	cfg := &genai.GenerateContentConfig{
		ResponseModalities: []string{"AUDIO"},
		SpeechConfig: &genai.SpeechConfig{
			VoiceConfig: &genai.VoiceConfig{
				PrebuiltVoiceConfig: &genai.PrebuiltVoiceConfig{
					VoiceName: ttsVoiceName,
				},
			},
		},
	}
	// Gemini's TTS models sometimes reply with a conversational text answer
	// instead of narrating bare short input — an explicit "read this aloud"
	// framing keeps it reliably in narration mode.
	prompt := "Read the following Japanese text aloud exactly as written, with no changes or commentary: " + text
	resp, err := client.Models.GenerateContent(ctx, ttsModel, genai.Text(prompt), cfg)
	if err != nil {
		return nil, "", fmt.Errorf("gemini tts: %w", err)
	}
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, "", fmt.Errorf("gemini tts: empty response")
	}
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.InlineData != nil && len(part.InlineData.Data) > 0 {
			return part.InlineData.Data, part.InlineData.MIMEType, nil
		}
	}
	return nil, "", fmt.Errorf("gemini tts: no audio in response")
}

// CallGeminiTTS synthesizes speech for text, retrying across configured
// projects on transient failures, and returns a browser-playable WAV file.
func CallGeminiTTS(ctx context.Context, text string) ([]byte, error) {
	if TTSRotator == nil {
		return nil, fmt.Errorf("gemini tts client not initialized")
	}

	maxAttempts := TTSRotator.clientCount()
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		client := TTSRotator.next()
		pcm, mimeType, err := callGeminiTTSOnce(ctx, client, text)
		if err == nil {
			return pcmToWAV(pcm, mimeType), nil
		}
		if !isRetriable(err) {
			return nil, err
		}
		log.Printf("[gemini tts] attempt %d/%d failed: %v — trying next project", attempt, maxAttempts, err)
		lastErr = err
	}
	return nil, fmt.Errorf("%w: %v", errAllModelsUnavailable, lastErr)
}

// pcmToWAV wraps raw 16-bit PCM audio (as returned by Gemini TTS, whose
// mimeType looks like "audio/L16;codec=pcm;rate=24000") in a WAV container so
// it can be played directly by an HTML <audio> element.
func pcmToWAV(pcm []byte, mimeType string) []byte {
	sampleRate := 24000
	if m := ttsSampleRateRe.FindStringSubmatch(mimeType); m != nil {
		if n, err := strconv.Atoi(m[1]); err == nil {
			sampleRate = n
		}
	}
	const channels = 1
	const bitsPerSample = 16
	byteRate := sampleRate * channels * bitsPerSample / 8
	blockAlign := channels * bitsPerSample / 8

	buf := new(bytes.Buffer)
	buf.WriteString("RIFF")
	binary.Write(buf, binary.LittleEndian, uint32(36+len(pcm)))
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	binary.Write(buf, binary.LittleEndian, uint32(16))
	binary.Write(buf, binary.LittleEndian, uint16(1))
	binary.Write(buf, binary.LittleEndian, uint16(channels))
	binary.Write(buf, binary.LittleEndian, uint32(sampleRate))
	binary.Write(buf, binary.LittleEndian, uint32(byteRate))
	binary.Write(buf, binary.LittleEndian, uint16(blockAlign))
	binary.Write(buf, binary.LittleEndian, uint16(bitsPerSample))
	buf.WriteString("data")
	binary.Write(buf, binary.LittleEndian, uint32(len(pcm)))
	buf.Write(pcm)
	return buf.Bytes()
}

// ── Gemini streaming call ────────────────────────────────────────────────────

// pulledStream holds a manually-driven (pull-based) Gemini stream so its
// first chunk can be inspected — and retried against another model on
// failure — before any SSE bytes are written to the client.
type pulledStream struct {
	model string
	next  func() (*genai.GenerateContentResponse, error, bool)
	stop  func()
	first *genai.GenerateContentResponse
}

// startGeminiStream tries the next model in rotation for a streaming call;
// on a retriable failure it advances to the next slot, up to once per
// available slot. Returns nil, errAllModelsUnavailable if every model failed,
// or the original non-retriable error otherwise.
func startGeminiStream(ctx context.Context, req SendReq, contents []*genai.Content) (*pulledStream, error) {
	maxAttempts := GeminiRotator.slotCount()
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		client, model, supportsThink := GeminiRotator.next()

		streamCfg := &genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{{Text: BuildStreamPrompt(req.TopicKey)}},
			},
			MaxOutputTokens: 512,
		}
		if supportsThink {
			budget := int32(0)
			streamCfg.ThinkingConfig = &genai.ThinkingConfig{ThinkingBudget: &budget}
		}

		stream := client.Models.GenerateContentStream(ctx, model, contents, streamCfg)
		next, stop := iter.Pull2(stream)
		first, err, ok := next()

		if err != nil {
			stop()
			if isRetriable(err) {
				log.Printf("[gemini] stream attempt %d/%d (model=%s) failed: %v — trying next model", attempt, maxAttempts, model, err)
				lastErr = err
				continue
			}
			return nil, err
		}
		if !ok {
			stop()
			log.Printf("[gemini] stream attempt %d/%d (model=%s) returned no content — trying next model", attempt, maxAttempts, model)
			lastErr = fmt.Errorf("empty stream")
			continue
		}
		return &pulledStream{model: model, next: next, stop: stop, first: first}, nil
	}
	return nil, fmt.Errorf("%w: %v", errAllModelsUnavailable, lastErr)
}

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
	if countUserTurns(req.History) >= maxUserTurns {
		w.WriteHeader(http.StatusForbidden)
		WriteJSON(w, map[string]string{"error": "conversation_limit_reached"})
		return
	}
	if GeminiRotator == nil {
		http.Error(w, "gemini not configured", http.StatusInternalServerError)
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

	// Find a working model before committing to SSE headers, so a failure here
	// can still return a normal HTTP status instead of an SSE error event.
	ps, err := startGeminiStream(r.Context(), req, contents)
	if err != nil {
		log.Printf("stream error: %v", err)
		writeGeminiError(w, err)
		return
	}
	defer ps.stop()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")

	// Vercel's Go Lambda runtime doesn't implement http.Flusher — the response
	// body is buffered and delivered whole once the handler returns. Flushing
	// is best-effort so real streaming still works locally (net/http server)
	// without hard-failing the request where it's unavailable.
	flusher, _ := w.(http.Flusher)

	writeSSE := func(v any) {
		b, _ := json.Marshal(v)
		fmt.Fprintf(w, "data: %s\n\n", b)
		if flusher != nil {
			flusher.Flush()
		}
	}

	const delimiter = "\n---\n"
	const safeBuffer = len(delimiter) // 5: never send chars that might be mid-delimiter

	var acc strings.Builder
	delimFound := false
	jaSent := 0
	var lastUsage *genai.GenerateContentResponseUsageMetadata

	handleChunk := func(resp *genai.GenerateContentResponse) {
		if resp.UsageMetadata != nil {
			lastUsage = resp.UsageMetadata
		}
		acc.WriteString(resp.Text())
		full := acc.String()

		if delimFound {
			return
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

	handleChunk(ps.first)

	for {
		resp, err, ok := ps.next()
		if !ok {
			break
		}
		if err != nil {
			// Mid-stream failures can't be retried against another model —
			// the client has already received partial content — so signal
			// the frontend to show an unavailable message.
			log.Printf("stream error mid-flight (model=%s): %v", ps.model, err)
			writeSSE(map[string]bool{"error": true, "unavailable": true})
			return
		}
		handleChunk(resp)
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
	if lastUsage != nil {
		log.Printf("[gemini] model=%s in=%d out=%d tokens (stream)", ps.model, lastUsage.PromptTokenCount, lastUsage.CandidatesTokenCount)
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

// writeGeminiError maps a CallGemini failure to an HTTP response: 503 with a
// structured body when every model in rotation was unavailable (so the
// frontend can show a friendly message), 502 for anything else.
func writeGeminiError(w http.ResponseWriter, err error) {
	if errors.Is(err, errAllModelsUnavailable) {
		w.WriteHeader(http.StatusServiceUnavailable)
		WriteJSON(w, map[string]string{"error": "service_unavailable"})
		return
	}
	http.Error(w, "upstream error", http.StatusBadGateway)
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
		writeGeminiError(w, err)
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
	if countUserTurns(req.History) >= maxUserTurns {
		w.WriteHeader(http.StatusForbidden)
		WriteJSON(w, map[string]string{"error": "conversation_limit_reached"})
		return
	}

	reply, err := CallGemini(r.Context(), req.TopicKey, req.Message, req.History)
	if err != nil {
		log.Printf("send error: %v", err)
		writeGeminiError(w, err)
		return
	}

	WriteJSON(w, SendResp{ReplyJa: reply.JA, ReplyEn: reply.EN})
}

func HandleTTS(w http.ResponseWriter, r *http.Request) {
	InitGemini()
	var req TTSReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		http.Error(w, "text is empty", http.StatusBadRequest)
		return
	}
	if len(text) > maxTTSChars {
		http.Error(w, "text too long", http.StatusBadRequest)
		return
	}

	wav, err := CallGeminiTTS(r.Context(), text)
	if err != nil {
		log.Printf("tts error: %v", err)
		writeGeminiError(w, err)
		return
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Write(wav)
}
