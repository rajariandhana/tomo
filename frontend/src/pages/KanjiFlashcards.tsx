import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'
import { FLASHCARD_HEIGHT, FlashCard } from '../components/FlashCard'
import { use_kanji_deck } from '../hooks/useKanjiDeck'
import { DECK_SIZE, is_jlpt_level, is_level_locked, new_seed } from '../lib/kanji'
import type { Jlpt_level } from '../types'

// Matches the matching game: cached kanji resolve instantly, which makes the
// skeleton flash for a frame and read as a glitch. Hold it so every session
// opens the same way.
const MIN_LOADING_MS = 700

const LEVEL_PATH = '/kanji/flashcards/level'

export function KanjiFlashcards() {
  const { level } = useParams()
  if (!is_jlpt_level(level)) return <Navigate to="/kanji" replace />
  // The level screen already diverts these, so anyone landing here typed or
  // bookmarked the URL. Send them to the upgrade page rather than a deck.
  if (is_level_locked(level)) return <Navigate to="/pro" replace />
  // Keyed by level so switching levels remounts with a fresh deck.
  return <FlashcardSession key={level} level={level} />
}

function FlashcardSession({ level }: { level: Jlpt_level }) {
  const navigate = useNavigate()
  const [seed, set_seed] = useState(new_seed)
  const { deck, is_loading, is_error } = use_kanji_deck(level, seed)

  // The queue holds the characters still to get right, current card first. A
  // card the player sends back goes to the tail, so the session only ends once
  // every card has been recalled at least once.
  const [queue, set_queue] = useState<string[]>([])
  const [learned, set_learned] = useState<string[]>([])
  const [again_count, set_again_count] = useState(0)
  const [is_flipped, set_is_flipped] = useState(false)
  // Distinguishes "the deck has not been dealt yet" from "the queue is empty
  // because the player finished", which look the same from the queue alone.
  const [is_started, set_is_started] = useState(false)

  const deck_signature = deck?.map(card => card.kanji).join('') ?? ''
  useEffect(() => {
    if (!deck) return
    set_queue(deck.map(card => card.kanji))
    set_is_started(true)
  }, [deck_signature])  // eslint-disable-line react-hooks/exhaustive-deps

  // Restarts on every new seed, so replaying a level also shows the skeleton.
  const [min_loading_done, set_min_loading_done] = useState(false)
  useEffect(() => {
    set_min_loading_done(false)
    const timer = setTimeout(() => set_min_loading_done(true), MIN_LOADING_MS)
    return () => clearTimeout(timer)
  }, [seed])

  const reset_session = () => {
    set_queue([])
    set_learned([])
    set_again_count(0)
    set_is_flipped(false)
    set_is_started(false)
    set_seed(new_seed())
  }

  const grade = (recalled: boolean) => {
    const current = queue[0]
    if (!current) return
    set_is_flipped(false)
    if (recalled) {
      set_learned(l => [...l, current])
      set_queue(q => q.slice(1))
    } else {
      set_again_count(c => c + 1)
      set_queue(q => [...q.slice(1), current])
    }
  }

  if (is_loading || !min_loading_done) return <LoadingScreen level={level} />
  if (is_error || !deck) return <ErrorScreen on_retry={reset_session} />
  if (is_started && queue.length === 0) {
    return (
      <ResultsScreen
        level={level}
        again_count={again_count}
        on_play_again={reset_session}
        on_change_level={() => navigate(LEVEL_PATH)}
      />
    )
  }

  const card = deck.find(c => c.kanji === queue[0])
  if (!card) return <LoadingScreen level={level} />

  return (
    <PageLayout show_back back_to={LEVEL_PATH}>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-tomo-blue tracking-tight">Flashcards</h1>
        <p className="text-xs text-gray-400 mt-1">
          {level} · {learned.length} of {DECK_SIZE} learned
        </p>
        <div className="h-1.5 w-40 mx-auto mt-3 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-tomo-blue"
            // Without an explicit start the bar animates down from its parent's
            // full width, so an empty deck opens looking almost finished.
            initial={{ width: 0 }}
            animate={{ width: `${(learned.length / DECK_SIZE) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </header>

      {/* Keyed on the character so each card mounts fresh, unflipped, and plays
          its own slide-in. No exit animation, for the same reason the matching
          board has none: a stalled frame loop would strand the player. */}
      <motion.div
        key={card.kanji}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <FlashCard card={card} is_flipped={is_flipped} on_flip={() => set_is_flipped(f => !f)} />
      </motion.div>

      {/* Fixed height so revealing the answer does not shift the card upward. */}
      <div className="h-[104px] mt-6 flex items-start justify-center">
        {is_flipped ? (
          <motion.div
            className="w-full flex flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Button variant="primary" onClick={() => grade(true)}>
              I knew it
            </Button>
            <Button variant="secondary" onClick={() => grade(false)}>
              Show me again
            </Button>
          </motion.div>
        ) : (
          <p className="text-xs text-gray-400 text-center leading-relaxed max-w-[16rem] pt-2">
            Say the meaning out loud, then tap the card to check yourself.
          </p>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        {queue.length} card{queue.length === 1 ? '' : 's'} left in this pass
      </p>
    </PageLayout>
  )
}

// A skeleton of the card that is about to appear, so the layout does not jump
// when the kanji arrive. The whole tree shares one pulse so the blocks breathe
// together rather than shimmering out of step.
function LoadingScreen({ level }: { level: Jlpt_level }) {
  return (
    <PageLayout show_back back_to={LEVEL_PATH}>
      <div
        className="animate-pulse"
        role="status"
        aria-busy="true"
        aria-label={`Building your ${level} deck`}
      >
        <header className="mb-6 flex flex-col items-center">
          <div className="h-8 w-40 rounded-lg bg-gray-100" />
          <div className="h-3 w-32 rounded bg-gray-100 mt-2" />
          <div className="h-1.5 w-40 rounded-full bg-gray-100 mt-4" />
        </header>

        <div className={`${FLASHCARD_HEIGHT} rounded-3xl bg-gray-100`} />

        <div className="h-[104px] mt-6 flex flex-col gap-3">
          <div className="h-11 rounded-full bg-gray-100" />
          <div className="h-11 rounded-full bg-gray-100" />
        </div>

        <div className="h-3 w-32 rounded bg-gray-100 mx-auto mt-4" />
      </div>
    </PageLayout>
  )
}

function ErrorScreen({ on_retry }: { on_retry: () => void }) {
  return (
    <PageLayout show_back back_to={LEVEL_PATH}>
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
  again_count: number
  on_play_again: () => void
  on_change_level: () => void
}

function ResultsScreen({ level, again_count, on_play_again, on_change_level }: Results_props) {
  // Every card is eventually learned, so the score is how many were recalled on
  // sight against the total number of looks the deck took.
  const recall = Math.round((DECK_SIZE / (DECK_SIZE + again_count)) * 100)
  const remark =
    again_count === 0
      ? 'Straight through, no second looks. These are yours.'
      : again_count <= 3
        ? 'Nearly clean. A couple more passes will settle them.'
        : again_count <= 10
          ? 'Good work. The deck is starting to stick.'
          : 'These are new to you. Run the deck again while they are fresh.'

  return (
    <PageLayout show_back back_to={LEVEL_PATH}>
      <motion.div
        className="flex flex-col items-center pt-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">{recall}%</h1>
        <p className="text-sm text-gray-400 mt-1.5">{level} deck complete</p>

        <div className="w-full max-w-xs grid grid-cols-2 gap-3 mt-8">
          <div className="p-4 rounded-2xl border border-blue-100 text-center">
            <p className="text-xl font-bold text-gray-800">{DECK_SIZE}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Cards learned</p>
          </div>
          <div className="p-4 rounded-2xl border border-blue-100 text-center">
            <p className={`text-xl font-bold ${again_count === 0 ? 'text-gray-800' : 'text-tomo-orange'}`}>
              {again_count}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Second looks</p>
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
