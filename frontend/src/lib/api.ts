import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

const FIRST_MESSAGES: Record<string, { ja: string; en: string }> = {
  self_introduction: {
    ja: 'はじめまして！私はトモです。あなたの名前は何ですか？',
    en: "Nice to meet you! I'm Tomo. What's your name?",
  },
  hometown: {
    ja: 'こんにちは！故郷について聞かせてください。どこから来ましたか？',
    en: 'Hello! Tell me about your hometown. Where are you from?',
  },
  food: {
    ja: 'こんにちは！食べ物の話をしましょう。好きな食べ物は何ですか？',
    en: "Hello! Let's talk about food. What's your favorite food?",
  },
  hobbies: {
    ja: 'こんにちは！趣味について教えてください。何が好きですか？',
    en: 'Hello! Tell me about your hobbies. What do you enjoy?',
  },
  travel: {
    ja: 'こんにちは！旅行が好きですか？どこに行きたいですか？',
    en: 'Hello! Do you like traveling? Where would you like to go?',
  },
  pop_culture: {
    ja: 'こんにちは！好きなアニメや映画はありますか？',
    en: 'Hello! Do you have a favorite anime or movie?',
  },
}

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

export type Start_conversation_request = {
  topic_key: string
}

export type Start_conversation_response = {
  first_message_ja: string
  first_message_en: string
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

export async function start_conversation(
  req: Start_conversation_request,
): Promise<Start_conversation_response> {
  if (USE_MOCK) {
    await random_delay()
    const msg = FIRST_MESSAGES[req.topic_key] ?? {
      ja: 'こんにちは！話しましょう！',
      en: "Hello! Let's talk!",
    }
    return { first_message_ja: msg.ja, first_message_en: msg.en }
  }
  const response = await client.post<Start_conversation_response>('/api/start', req, {
    validateStatus: () => true,
  })
  if (response.status === 503) throw new Service_unavailable_error()
  if (response.status !== 200) throw new Error(`start failed: ${response.status}`)
  return response.data
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
  if (response.status !== 200) throw new Error(`send failed: ${response.status}`)
  return response.data
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
