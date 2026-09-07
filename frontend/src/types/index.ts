export type Topic = {
  key: string
  en: string
  ja: string
}

export type Message_role = 'ai' | 'user'

export type Message = {
  id: string
  role: Message_role
  content_ja: string
  content_en?: string
  streaming?: boolean
  is_error?: boolean
  created_at: number
  /** Precomputed static audio for this exact text, if any — skips the on-demand TTS fetch. */
  audio_url?: string
}
