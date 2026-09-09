import axios from 'axios'
import type { Jlpt_level, Kanji_card, Kanji_mode } from '../types'

// kanjiapi.dev is a free, key-less, CORS-enabled read-only mirror of the KANJIDIC2
// dictionary. Its data is static, so every query built on it is cached forever
// (staleTime: Infinity) by the hooks in ../hooks/useKanjiRound.ts.
const client = axios.create({ baseURL: 'https://kanjiapi.dev/v1' })

// ── Static metadata ─────────────────────────────────────────────────────────

export const KANJI_MODES: { key: Kanji_mode; label: string; ja: string; blurb: string; available: boolean }[] = [
  {
    key: 'matching',
    label: 'Matching',
    ja: '組み合わせ',
    blurb: 'Pair each kanji with its English meaning across five rounds.',
    available: true,
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    ja: '単語カード',
    blurb: 'Flip through kanji one at a time and test your recall.',
    available: false,
  },
]

// Listed easiest first - the level screen renders them in this order, top to bottom.
export const JLPT_LEVELS: { level: Jlpt_level; endpoint: string; blurb: string }[] = [
  { level: 'N5', endpoint: 'jlpt-5', blurb: 'Beginner - the first 80 kanji' },
  { level: 'N4', endpoint: 'jlpt-4', blurb: 'Elementary - everyday basics' },
  { level: 'N3', endpoint: 'jlpt-3', blurb: 'Intermediate - a big jump up' },
  { level: 'N2', endpoint: 'jlpt-2', blurb: 'Upper intermediate - news and work' },
  { level: 'N1', endpoint: 'jlpt-1', blurb: 'Advanced - the hardest level' },
]

export const ROUND_COUNT = 5
export const PAIRS_PER_ROUND = 5
export const TOTAL_PAIRS = ROUND_COUNT * PAIRS_PER_ROUND

// Some candidates get dropped for having no usable meaning or for colliding with
// a meaning already in play, so the pool is drawn wider than TOTAL_PAIRS.
export const CANDIDATE_COUNT = 34

export function is_jlpt_level(value: string | undefined): value is Jlpt_level {
  return JLPT_LEVELS.some(l => l.level === value)
}

function endpoint_for(level: Jlpt_level): string {
  return JLPT_LEVELS.find(l => l.level === level)!.endpoint
}

// ── API ─────────────────────────────────────────────────────────────────────

export type Kanji_detail = {
  kanji: string
  meanings: string[]
  kun_readings: string[]
  on_readings: string[]
  stroke_count: number
}

/** Every kanji character belonging to one JLPT level. */
export async function fetch_level_kanji(level: Jlpt_level): Promise<string[]> {
  const response = await client.get<string[]>(`/kanji/${endpoint_for(level)}`)
  return response.data
}

/** Readings and English meanings for a single kanji character. */
export async function fetch_kanji_detail(kanji: string): Promise<Kanji_detail> {
  const response = await client.get<Kanji_detail>(`/kanji/${encodeURIComponent(kanji)}`)
  return response.data
}

// ── Randomisation ───────────────────────────────────────────────────────────

// A seeded generator keeps a round's layout stable across React re-renders (and
// across StrictMode's double-invoke) while still differing on every new game.
function make_rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function new_seed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/** Draw the candidate characters a game will try to build its 25 pairs from. */
export function pick_candidates(all_kanji: string[], seed: number): string[] {
  return shuffle(all_kanji, make_rng(seed)).slice(0, CANDIDATE_COUNT)
}

// ── Round building ──────────────────────────────────────────────────────────

// KANJIDIC meanings range from one word to a whole gloss ("counter for days").
// Short ones read better in a tile, so prefer the shortest that still fits.
const MAX_MEANING_LENGTH = 16

function pick_meaning(detail: Kanji_detail): string | null {
  const usable = detail.meanings.filter(m => m.trim().length > 0)
  if (usable.length === 0) return null
  // KANJIDIC lists affix glosses like "re-" or "-ness" first for some entries.
  // They read as fragments in a tile, so fall past them when a real word exists.
  const words = usable.filter(m => !m.startsWith('-') && !m.endsWith('-'))
  const pool = words.length > 0 ? words : usable
  const short = pool.filter(m => m.length <= MAX_MEANING_LENGTH)
  return (short.length > 0 ? short : pool)[0]
}

/**
 * Turn fetched kanji details into ROUND_COUNT rounds of PAIRS_PER_ROUND pairs.
 * No kanji and no meaning is ever used twice, so a character seen in round 1
 * cannot reappear in round 4. Returns null when too few usable pairs survived.
 */
export function build_rounds(details: Kanji_detail[], seed: number): Kanji_card[][] | null {
  const rng = make_rng(seed ^ 0x9e3779b9)
  const seen_kanji = new Set<string>()
  const seen_meanings = new Set<string>()
  const cards: Kanji_card[] = []

  for (const detail of shuffle(details, rng)) {
    if (cards.length === TOTAL_PAIRS) break
    if (seen_kanji.has(detail.kanji)) continue
    const meaning = pick_meaning(detail)
    if (!meaning) continue
    // Two tiles reading "gate" would make a round unanswerable, not just hard.
    const key = meaning.toLowerCase()
    if (seen_meanings.has(key)) continue
    seen_kanji.add(detail.kanji)
    seen_meanings.add(key)
    cards.push({ kanji: detail.kanji, meaning })
  }

  if (cards.length < TOTAL_PAIRS) return null

  return Array.from({ length: ROUND_COUNT }, (_, i) =>
    cards.slice(i * PAIRS_PER_ROUND, (i + 1) * PAIRS_PER_ROUND),
  )
}

/** The meaning column is shuffled independently so rows never line up by default. */
export function shuffle_meanings(round: Kanji_card[], seed: number, round_index: number): Kanji_card[] {
  const shuffled = shuffle(round, make_rng(seed + round_index * 7919 + 1))
  // A shuffle is allowed to land on the identity permutation, which would hand
  // the player a whole round for free. Rotate one step when it does.
  const unchanged = shuffled.every((card, i) => card.kanji === round[i].kanji)
  return unchanged ? [...shuffled.slice(1), shuffled[0]] : shuffled
}
