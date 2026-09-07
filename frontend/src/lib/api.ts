import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

const FOLLOW_UP_REPLIES = [
  { ja: 'そうですか！もっと教えてください。',        en: 'Is that so! Please tell me more.' },
  { ja: 'なるほど。それはどうしてですか？',           en: 'I see. Why is that?' },
  { ja: '面白いですね！私も同じです。',               en: "That's interesting! Same here." },
  { ja: 'すばらしいですね！他には何かありますか？',    en: "That's wonderful! Is there anything else?" },
  { ja: 'それはいいですね。よくしますか？',           en: 'That sounds nice. Do you do it often?' },
  { ja: 'へえ、本当ですか？詳しく話してください。',   en: 'Oh really? Please tell me more about that.' },
]

function random_delay(): Promise<void> {
  const ms = 1200 + Math.random() * 700
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Request / response shapes (match backend contract) ──────────────────────

export type History_item = {
  role: 'user' | 'model'
  content: string
}

export type Send_message_request = {
  topic_key: string
  message: string
  history: History_item[]
}

export type Send_message_response = {
  reply_ja: string
  reply_en: string
}

// ── API functions ────────────────────────────────────────────────────────────

const USE_MOCK = false

// Thrown when every Gemini model in rotation was unavailable (backend returns
// HTTP 503 or an SSE "unavailable" event). Callers should show the user a
// friendly "try again later" message rather than failing silently.
export class Service_unavailable_error extends Error {
  constructor() {
    super('service_unavailable')
    this.name = 'Service_unavailable_error'
  }
}

// Thrown when the backend's turn-limit backstop rejects a message (HTTP 403).
// The frontend already hides the input after 5 exchanges, so this only fires
// if that client-side state is bypassed or gets out of sync.
export class Conversation_limit_error extends Error {
  constructor() {
    super('conversation_limit_reached')
    this.name = 'Conversation_limit_error'
  }
}

export async function send_message(
  req: Send_message_request,
): Promise<Send_message_response> {
  if (USE_MOCK) {
    await random_delay()
    const pick = FOLLOW_UP_REPLIES[Math.floor(Math.random() * FOLLOW_UP_REPLIES.length)]
    return { reply_ja: pick.ja, reply_en: pick.en }
  }
  const response = await client.post<Send_message_response>('/api/send', req, {
    validateStatus: () => true,
  })
  if (response.status === 503) throw new Service_unavailable_error()
  if (response.status === 403) throw new Conversation_limit_error()
  if (response.status !== 200) throw new Error(`send failed: ${response.status}`)
  return response.data
}

export async function text_to_speech(text: string): Promise<Blob> {
  const response = await client.post('/api/tts', { text }, {
    responseType: 'blob',
    validateStatus: () => true,
  })
  if (response.status === 503) throw new Service_unavailable_error()
  if (response.status !== 200) throw new Error(`tts failed: ${response.status}`)
  return response.data as Blob
}

// Data URLs (unlike object URLs) are plain strings that stay valid across
// route navigation and don't need manual revocation, so cached TTS audio can
// be lifted onto a Message and reused on the conversation-ended page without
// hitting /api/tts again.
export function blob_to_data_url(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function send_message_stream(
  req: Send_message_request,
  on_chunk: (partial_ja: string) => void,
  on_done: (ja: string, en: string) => void,
): Promise<void> {
  if (USE_MOCK) {
    const pick = FOLLOW_UP_REPLIES[Math.floor(Math.random() * FOLLOW_UP_REPLIES.length)]
    for (const char of pick.ja) {
      await new Promise(r => setTimeout(r, 40))
      on_chunk(char)
    }
    on_done(pick.ja, pick.en)
    return
  }

  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
  const response = await fetch(`${base}/api/send/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (response.status === 503) throw new Service_unavailable_error()
  if (response.status === 403) throw new Conversation_limit_error()
  if (!response.ok || !response.body) throw new Error('stream failed')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6)) as Record<string, unknown>
        if (typeof event.chunk === 'string') {
          on_chunk(event.chunk)
        } else if (event.done === true) {
          on_done(event.ja as string, event.en as string)
        } else if (event.unavailable) {
          throw new Service_unavailable_error()
        } else if (event.error) {
          throw new Error('stream error')
        }
      } catch (err) {
        if (err instanceof Service_unavailable_error) throw err
        // ignore malformed lines
      }
    }
  }
}
