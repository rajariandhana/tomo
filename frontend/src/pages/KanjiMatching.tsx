import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'
import { MatchTile } from '../components/MatchTile'
import { use_kanji_rounds } from '../hooks/useKanjiRounds'
import {
  is_jlpt_level,
  new_seed,
  PAIRS_PER_ROUND,
  ROUND_COUNT,
  shuffle_meanings,
  TOTAL_PAIRS,
} from '../lib/kanji'
import type { Jlpt_level } from '../types'

const WRONG_FEEDBACK_MS = 620
const ROUND_ADVANCE_MS = 700
// Cached kanji resolve instantly, which makes the skeleton flash for a frame and
// read as a glitch. Hold it for this long so every game opens the same way.
const MIN_LOADING_MS = 700

export function KanjiMatching() {
  const { level } = useParams()
  if (!is_jlpt_level(level)) return <Navigate to="/kanji" replace />
  // Keyed by level so switching levels remounts with a fresh game.
  return <MatchingGame key={level} level={level} />
}

type Wrong_pair = { kanji: string; meaning: string }

function MatchingGame({ level }: { level: Jlpt_level }) {
  const navigate = useNavigate()
  const [seed, set_seed] = useState(new_seed)
  const { rounds, is_loading, is_error } = use_kanji_rounds(level, seed)

  const [round_index, set_round_index] = useState(0)
  // Matched pairs are tracked by their kanji character, which identifies both
  // the kanji tile and the meaning tile that belongs to it.
  const [matched, set_matched] = useState<string[]>([])
  const [selected_kanji, set_selected_kanji] = useState<string | null>(null)
  const [selected_meaning, set_selected_meaning] = useState<string | null>(null)
  const [wrong_pair, set_wrong_pair] = useState<Wrong_pair | null>(null)
  const [mistakes, set_mistakes] = useState(0)
  const [is_finished, set_is_finished] = useState(false)

  // Restarts on every new seed, so replaying a level also shows the skeleton.
  const [min_loading_done, set_min_loading_done] = useState(false)
  useEffect(() => {
    set_min_loading_done(false)
    const timer = setTimeout(() => set_min_loading_done(true), MIN_LOADING_MS)
    return () => clearTimeout(timer)
  }, [seed])

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const round = rounds?.[round_index] ?? []
  const meaning_column = useMemo(
    () => (round.length > 0 ? shuffle_meanings(round, seed, round_index) : []),
    [round, seed, round_index],
  )

  // Input is frozen while the wrong-answer shake plays out and while the board
  // is waiting to slide to the next round.
  const [is_locked, set_is_locked] = useState(false)

  const reset_game = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    set_round_index(0)
    set_matched([])
    set_selected_kanji(null)
    set_selected_meaning(null)
    set_wrong_pair(null)
    set_mistakes(0)
    set_is_finished(false)
    set_is_locked(false)
    set_seed(new_seed())
  }

  const finish_round = () => {
    set_is_locked(true)
    schedule(() => {
      if (round_index + 1 < ROUND_COUNT) {
        set_round_index(i => i + 1)
        set_matched([])
        set_is_locked(false)
      } else {
        set_is_finished(true)
      }
    }, ROUND_ADVANCE_MS)
  }

  const handle_select = (id: string, column: 'kanji' | 'meaning') => {
    if (is_locked || matched.includes(id)) return

    const own = column === 'kanji' ? selected_kanji : selected_meaning
    const other = column === 'kanji' ? selected_meaning : selected_kanji
    const set_own = column === 'kanji' ? set_selected_kanji : set_selected_meaning
    const set_other = column === 'kanji' ? set_selected_meaning : set_selected_kanji

    // Tapping the highlighted tile again clears it.
    if (own === id) {
      set_own(null)
      return
    }
    // Nothing to compare against yet — just take the slot in this column.
    if (other === null) {
      set_own(id)
      return
    }

    if (other === id) {
      set_own(null)
      set_other(null)
      const next_matched = [...matched, id]
      set_matched(next_matched)
      if (next_matched.length === PAIRS_PER_ROUND) finish_round()
      return
    }

    set_mistakes(m => m + 1)
    set_own(id)
    set_wrong_pair(
      column === 'kanji' ? { kanji: id, meaning: other } : { kanji: other, meaning: id },
    )
    set_is_locked(true)
    schedule(() => {
      set_wrong_pair(null)
      set_selected_kanji(null)
      set_selected_meaning(null)
      set_is_locked(false)
    }, WRONG_FEEDBACK_MS)
  }

  if (is_loading || !min_loading_done) return <LoadingScreen level={level} />
  if (is_error || !rounds) return <ErrorScreen on_retry={reset_game} />
  if (is_finished) {
    return (
      <ResultsScreen
        level={level}
        mistakes={mistakes}
        on_play_again={reset_game}
        on_change_level={() => navigate('/kanji/matching/level')}
      />
    )
  }

  return (
    <PageLayout show_back back_to="/kanji/matching/level">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-tomo-blue tracking-tight">Matching</h1>
        <p className="text-xs text-gray-400 mt-1">
          {level} · Round {round_index + 1} of {ROUND_COUNT}
        </p>
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: ROUND_COUNT }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < round_index
                  ? 'w-5 bg-tomo-blue'
                  : i === round_index
                    ? 'w-5 bg-blue-300'
                    : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </header>

      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4 text-center">
        Match each kanji to its meaning
      </p>

      {/* Keyed on the round so each one remounts and plays its own slide-in. An
          exit animation is deliberately avoided: it would hold the finished
          board on screen, and a stalled frame loop would strand the player. */}
      <motion.div
        key={round_index}
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="flex flex-col gap-3">
          {round.map(card => (
            <MatchTile
              key={card.kanji}
              label={card.kanji}
              variant="kanji"
              is_selected={selected_kanji === card.kanji}
              is_matched={matched.includes(card.kanji)}
              is_wrong={wrong_pair?.kanji === card.kanji}
              on_click={() => handle_select(card.kanji, 'kanji')}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {meaning_column.map(card => (
            <MatchTile
              key={card.kanji}
              label={card.meaning}
              variant="meaning"
              is_selected={selected_meaning === card.kanji}
              is_matched={matched.includes(card.kanji)}
              is_wrong={wrong_pair?.meaning === card.kanji}
              on_click={() => handle_select(card.kanji, 'meaning')}
            />
          ))}
        </div>
      </motion.div>

      <p className="text-center text-xs text-gray-400 mt-6">
        {mistakes === 0 ? 'No mistakes yet' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
      </p>
    </PageLayout>
  )
}

// A skeleton of the board that is about to appear, so the layout does not jump
// when the kanji arrive. The whole tree shares one pulse so the blocks breathe
// together rather than shimmering out of step.
function LoadingScreen({ level }: { level: Jlpt_level }) {
  return (
    <PageLayout show_back back_to="/kanji/matching/level">
      <div
        className="animate-pulse"
        role="status"
        aria-busy="true"
        aria-label={`Building your ${level} rounds`}
      >
        <header className="mb-6 flex flex-col items-center">
          <div className="h-8 w-36 rounded-lg bg-gray-100" />
          <div className="h-3 w-28 rounded bg-gray-100 mt-2" />
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: ROUND_COUNT }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full bg-gray-100 ${i === 0 ? 'w-5' : 'w-1.5'}`}
              />
            ))}
          </div>
        </header>

        <div className="h-2.5 w-52 rounded bg-gray-100 mx-auto mb-4" />

        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(column => (
            <div key={column} className="flex flex-col gap-3">
              {Array.from({ length: PAIRS_PER_ROUND }, (_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-100" />
              ))}
            </div>
          ))}
        </div>

        <div className="h-3 w-24 rounded bg-gray-100 mx-auto mt-6" />
      </div>
    </PageLayout>
  )
}

function ErrorScreen({ on_retry }: { on_retry: () => void }) {
  return (
    <PageLayout show_back back_to="/kanji/matching/level">
      <div className="flex flex-col items-center justify-center pt-28 px-4">
        <p className="text-sm font-semibold text-gray-700 text-center">
          Couldn't load enough kanji
        </p>
        <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed max-w-[16rem]">
          The kanji dictionary didn't respond. Check your connection and try again.
        </p>
        <div className="w-full max-w-xs mt-8">
          <Button variant="primary" onClick={on_retry}>
            Try again
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}

type Results_props = {
  level: Jlpt_level
  mistakes: number
  on_play_again: () => void
  on_change_level: () => void
}

function ResultsScreen({ level, mistakes, on_play_again, on_change_level }: Results_props) {
  const accuracy = Math.round((TOTAL_PAIRS / (TOTAL_PAIRS + mistakes)) * 100)
  const remark =
    mistakes === 0
      ? 'A perfect run. Nothing to fix.'
      : mistakes <= 5
        ? 'Very close to clean. These are nearly yours.'
        : mistakes <= 15
          ? 'Solid progress. Another pass will lock them in.'
          : 'These are new to you. Run the level again.'

  return (
    <PageLayout show_back back_to="/kanji/matching/level">
      <motion.div
        className="flex flex-col items-center pt-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">{accuracy}%</h1>
        <p className="text-sm text-gray-400 mt-1.5">{level} matching complete</p>

        <div className="w-full max-w-xs grid grid-cols-2 gap-3 mt-8">
          <div className="p-4 rounded-2xl border border-blue-100 text-center">
            <p className="text-xl font-bold text-gray-800">{TOTAL_PAIRS}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Pairs matched</p>
          </div>
          <div className="p-4 rounded-2xl border border-blue-100 text-center">
            <p className={`text-xl font-bold ${mistakes === 0 ? 'text-gray-800' : 'text-tomo-orange'}`}>
              {mistakes}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Wrong guesses</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed text-center max-w-xs mt-6">{remark}</p>

        <div className="w-full max-w-xs flex flex-col gap-3 mt-10">
          <Button variant="primary" onClick={on_play_again}>
            Play again
          </Button>
          <Button variant="secondary" onClick={on_change_level}>
            Choose another level
          </Button>
        </div>
      </motion.div>
    </PageLayout>
  )
}
