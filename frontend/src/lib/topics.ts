import type { Topic } from '../types'

export const ALL_TOPICS: Topic[] = [
  { key: 'self_introduction', en: 'Self Introduction', ja: '自己紹介' },
  { key: 'hometown',          en: 'Hometown',          ja: '故郷'           },
  { key: 'food',              en: 'Food',              ja: '食べ物'         },
  { key: 'hobbies',           en: 'Hobbies',           ja: '趣味'           },
  { key: 'travel',            en: 'Travel',            ja: '旅行'           },
  { key: 'pop_culture',       en: 'Pop Culture',       ja: 'ポップカルチャー' },
]

export function pick_random_topics(count: number = 4): Topic[] {
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
