# Tomo

Learn Japanese through natural back-and-forth conversation with an AI.

## How it works

1. Pick one of four randomly drawn topic cards — self introduction, hometown, food, hobbies, travel, or pop culture.
2. The AI opens the conversation in Japanese.
3. Reply in any way you like; the AI responds turn by turn.
4. Tap **Show translation** under any AI message to reveal the English if you need it.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4 |
| Routing | React Router 7 |
| Data fetching | TanStack Query 5, axios |
| Animation | Framer Motion 11 |
| Runtime | Bun |
| Backend (planned) | Go, Gin |
| AI (planned) | Google Gemini |

## Project structure

```
tomo/
  frontend/          # Vite SPA
    src/
      components/    # TopicCard, MessageBubble, TypingIndicator, TopicIcon
      pages/         # TopicSelection, Conversation
      lib/           # api.ts (mock + real client), topics.ts
      types/         # shared TypeScript types
  backend/           # Go API (not yet implemented)
```

## Getting started

```bash
cd frontend
bun install
bun run dev          # http://localhost:5173
```

## Environment variables

Copy the examples and fill in your values before starting the backend.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

| File | Variable | Description |
|---|---|---|
| `.env` | `GEMINI_API_KEY` | Google Gemini API key |
| `.env` | `PORT` | Backend port (default `8080`) |
| `frontend/.env` | `VITE_API_URL` | Backend origin (default `http://localhost:8080`) |

## API contract

The frontend expects these two endpoints from the backend. Currently mocked in `frontend/src/lib/api.ts` — set `USE_MOCK = false` to switch to the real backend.

```
POST /api/conversations
  body:    { "topic_key": string }
  returns: { "conversation_id": string, "first_message_ja": string, "first_message_en": string }

POST /api/conversations/:id/messages
  body:    { "message": string }
  returns: { "reply_ja": string, "reply_en": string }
```

All JSON uses snake_case.
