// gentts pregenerates WAV audio for (1) each topic's fixed conversation
// starter line and (2) the AI lines in DevEndedPreview's mock conversation,
// so the frontend can play them instantly instead of hitting /api/tts. Run
// it once whenever a starter or mock line changes:
//
//	cd backend && go run ./cmd/gentts
//
// Starter output goes to frontend/public/audio/<topic_key>.wav; the `ja`
// text below must stay byte-for-byte in sync with TOPIC_STARTERS in
// frontend/src/lib/topics.ts.
//
// Mock output goes to frontend/public/audio/mock-<id>.wav; the `ja` text
// below must stay byte-for-byte in sync with the AI entries in
// MOCK_MESSAGES in frontend/src/pages/DevEndedPreview.tsx.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/ralfazza/tomo/pkg"
)

var starters = map[string]string{
	"self_introduction": "はじめまして！私はトモです。あなたの名前は何ですか？",
	"food":              "こんにちは！食べ物の話をしましょう。好きな食べ物は何ですか？",
	"travel":            "こんにちは！旅行が好きですか？どこに行きたいですか？",
	"pop_culture":       "こんにちは！好きなアニメや映画はありますか？",
}

var mockMessages = map[string]string{
	"1":  "こんにちは!食べ物の話をしましょう。好きな食べ物は何ですか?",
	"3":  "いいですね!どんな寿司が好きですか?",
	"5":  "サーモンは美味しいですよね!どこで食べますか?",
	"7":  "回転寿司はいいですね!よく行きますか?",
	"9":  "それはいいですね!他に好きな日本料理はありますか?",
	"11": "ラーメンもいいですね!今日は楽しい会話をありがとうございました。",
}

func generate(ctx context.Context, outDir, prefix string, entries map[string]string) {
	for key, text := range entries {
		name := prefix + key
		fmt.Printf("generating %s.wav ...\n", name)
		wav, err := pkg.CallGeminiTTS(ctx, text)
		if err != nil {
			log.Fatalf("tts for %s: %v", name, err)
		}
		path := filepath.Join(outDir, name+".wav")
		if err := os.WriteFile(path, wav, 0644); err != nil {
			log.Fatalf("write %s: %v", path, err)
		}
		fmt.Printf("wrote %s (%d bytes)\n", path, len(wav))
	}
}

func main() {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	pkg.InitGemini()

	outDir := filepath.Join("..", "frontend", "public", "audio")
	if err := os.MkdirAll(outDir, 0755); err != nil {
		log.Fatalf("mkdir %s: %v", outDir, err)
	}

	ctx := context.Background()
	generate(ctx, outDir, "", starters)
	generate(ctx, outDir, "mock-", mockMessages)

	fmt.Println("done")
}
