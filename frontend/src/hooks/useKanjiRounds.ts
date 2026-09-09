import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  build_rounds,
  fetch_kanji_detail,
  fetch_level_kanji,
  pick_candidates,
} from '../lib/kanji'
import type { Kanji_detail } from '../lib/kanji'
import type { Jlpt_level, Kanji_card } from '../types'

export type Kanji_rounds = {
  rounds: Kanji_card[][] | null
  is_loading: boolean
  is_error: boolean
}

/**
 * Loads one game's worth of kanji for a JLPT level and slices it into rounds.
 *
 * The level list and every kanji detail are separate TanStack Query entries
 * keyed by character, so a character already fetched for an earlier game (or an
 * earlier level, since levels overlap in nothing but are re-drawn on replay) is
 * served from cache instead of the network. The dictionary never changes, so
 * both are cached indefinitely.
 *
 * `seed` fixes which characters get drawn — pass a new one to reshuffle.
 */
export function use_kanji_rounds(level: Jlpt_level, seed: number): Kanji_rounds {
  const list = useQuery({
    queryKey: ['kanji', 'level', level],
    queryFn: () => fetch_level_kanji(level),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const candidates = useMemo(
    () => (list.data ? pick_candidates(list.data, seed) : []),
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
      // Rounds are only built once every request has settled, so the board can
      // never change under the player mid-game.
      settled: results.every(r => !r.isPending),
      data: results.map(r => r.data).filter((d): d is Kanji_detail => d !== undefined),
    }),
  })

  const details_signature = details.data.map(d => d.kanji).join('')

  const rounds = useMemo(
    () => (details.settled && candidates.length > 0 ? build_rounds(details.data, seed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [details.settled, details_signature, candidates.length, seed],
  )

  return {
    rounds,
    is_loading: list.isPending || (candidates.length > 0 && !details.settled),
    is_error: list.isError || (details.settled && candidates.length > 0 && rounds === null),
  }
}
