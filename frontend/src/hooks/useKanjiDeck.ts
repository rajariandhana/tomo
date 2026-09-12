import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  build_deck,
  DECK_CANDIDATE_COUNT,
  fetch_kanji_detail,
  fetch_level_kanji,
  pick_candidates,
} from '../lib/kanji'
import type { Kanji_detail } from '../lib/kanji'
import type { Jlpt_level, Kanji_flashcard } from '../types'

export type Kanji_deck = {
  deck: Kanji_flashcard[] | null
  is_loading: boolean
  is_error: boolean
}

/**
 * Loads one deck of flashcards for a JLPT level.
 *
 * Queries are keyed exactly as they are in ../hooks/useKanjiRounds.ts, so the
 * level list and any character already fetched for a matching game are served
 * from cache. The dictionary never changes, so both are cached indefinitely.
 *
 * `seed` fixes which characters get drawn - pass a new one to reshuffle.
 */
export function use_kanji_deck(level: Jlpt_level, seed: number): Kanji_deck {
  const list = useQuery({
    queryKey: ['kanji', 'level', level],
    queryFn: () => fetch_level_kanji(level),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const candidates = useMemo(
    () => (list.data ? pick_candidates(list.data, seed, DECK_CANDIDATE_COUNT) : []),
    [list.data, seed],
  )

  const details = useQueries({
    queries: candidates.map(kanji => ({
      queryKey: ['kanji', 'detail', kanji],
      queryFn: () => fetch_kanji_detail(kanji),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
    combine: results => ({
      // The deck is only built once every request has settled, so cards can
      // never be inserted under the player mid-session.
      settled: results.every(r => !r.isPending),
      data: results.map(r => r.data).filter((d): d is Kanji_detail => d !== undefined),
    }),
  })

  const details_signature = details.data.map(d => d.kanji).join('')

  const deck = useMemo(
    () => (details.settled && candidates.length > 0 ? build_deck(details.data, seed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [details.settled, details_signature, candidates.length, seed],
  )

  return {
    deck,
    is_loading: list.isPending || (candidates.length > 0 && !details.settled),
    is_error: list.isError || (details.settled && candidates.length > 0 && deck === null),
  }
}
