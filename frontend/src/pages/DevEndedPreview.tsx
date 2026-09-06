// TEMPORARY dev-only route to preview the ConversationEnded page with mock
// history, without playing through 5 real exchanges. Safe to delete along
// with its route in App.tsx once no longer needed.
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { Message } from '../types'

const MOCK_MESSAGES: Message[] = [
  {
    id: '1', role: 'ai', created_at: Date.now(),
    content_ja: 'こんにちは!食べ物の話をしましょう。好きな食べ物は何ですか?',
    content_en: "Hello! Let's talk about food. What's your favorite food?",
  },
  { id: '2', role: 'user', created_at: Date.now(), content_ja: '寿司が好きです。' },
  {
    id: '3', role: 'ai', created_at: Date.now(),
    content_ja: 'いいですね!どんな寿司が好きですか?',
    content_en: 'Nice! What kind of sushi do you like?',
  },
  { id: '4', role: 'user', created_at: Date.now(), content_ja: 'サーモンが好きです。' },
  {
    id: '5', role: 'ai', created_at: Date.now(),
    content_ja: 'サーモンは美味しいですよね!どこで食べますか?',
    content_en: 'Salmon is delicious! Where do you eat it?',
  },
  { id: '6', role: 'user', created_at: Date.now(), content_ja: '近所の回転寿司です。' },
  {
    id: '7', role: 'ai', created_at: Date.now(),
    content_ja: '回転寿司はいいですね!よく行きますか?',
    content_en: 'Conveyor belt sushi sounds great! Do you go often?',
  },
  { id: '8', role: 'user', created_at: Date.now(), content_ja: '週に一回くらい行きます。' },
  {
    id: '9', role: 'ai', created_at: Date.now(),
    content_ja: 'それはいいですね!他に好きな日本料理はありますか?',
    content_en: "That's nice! Any other Japanese food you like?",
  },
  { id: '10', role: 'user', created_at: Date.now(), content_ja: 'ラーメンも大好きです。' },
  {
    id: '11', role: 'ai', created_at: Date.now(),
    content_ja: 'ラーメンもいいですね!今日は楽しい会話をありがとうございました。',
    content_en: 'Ramen is great too! Thanks for the fun conversation today.',
  },
]

export function DevEndedPreview() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/conversation/ended', { replace: true, state: { messages: MOCK_MESSAGES } })
  }, [navigate])

  return null
}
