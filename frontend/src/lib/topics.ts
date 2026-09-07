import type { Topic } from '../types'

export const ALL_TOPICS: Topic[] = [
  { key: 'self_introduction', en: 'Self Introduction', ja: '自己紹介' },
  // { key: 'hometown',          en: 'Hometown',          ja: '故郷'           },
  { key: 'food',              en: 'Food',              ja: '食べ物'         },
  // { key: 'hobbies',           en: 'Hobbies',           ja: '趣味'           },
  { key: 'travel',            en: 'Travel',            ja: '旅行'           },
  { key: 'pop_culture',       en: 'Pop Culture',       ja: 'ポップカルチャー' },
]

export function pick_random_topics(count: number = 4): Topic[] {
	return ALL_TOPICS;
  const shuffled = [...ALL_TOPICS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

export function get_topic(key: string): Topic | undefined {
  return ALL_TOPICS.find(t => t.key === key)
}

// ── Prebuilt conversation starters ──────────────────────────────────────────
// One fixed opening line per topic, spoken by Tomo immediately on entering a
// conversation — skips the network round trip to /api/start. The `ja` text
// here must stay byte-for-byte in sync with backend/cmd/gentts/main.go, which
// pregenerates the matching audio_url files under frontend/public/audio/.

export type Topic_starter = {
  ja: string
  en: string
  audio_url: string
}

const TOPIC_STARTERS: Record<string, Topic_starter> = {
  self_introduction: {
    ja: 'はじめまして！私はトモです。あなたの名前は何ですか？',
    en: "Nice to meet you! I'm Tomo. What's your name?",
    audio_url: '/audio/self_introduction.wav',
  },
  food: {
    ja: 'こんにちは！食べ物の話をしましょう。好きな食べ物は何ですか？',
    en: "Hello! Let's talk about food. What's your favorite food?",
    audio_url: '/audio/food.wav',
  },
  travel: {
    ja: 'こんにちは！旅行が好きですか？どこに行きたいですか？',
    en: 'Hello! Do you like traveling? Where would you like to go?',
    audio_url: '/audio/travel.wav',
  },
  pop_culture: {
    ja: 'こんにちは！好きなアニメや映画はありますか？',
    en: 'Hello! Do you have a favorite anime or movie?',
    audio_url: '/audio/pop_culture.wav',
  },
}

export function get_topic_starter(key: string): Topic_starter {
  return TOPIC_STARTERS[key] ?? {
    ja: 'こんにちは！話しましょう！',
    en: "Hello! Let's talk!",
    audio_url: '',
  }
}
