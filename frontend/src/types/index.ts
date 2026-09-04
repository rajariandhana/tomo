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
  created_at: number
}
