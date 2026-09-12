import { motion } from 'framer-motion'
import type { Kanji_flashcard } from '../types'

type Props = {
  card: Kanji_flashcard
  is_flipped: boolean
  on_flip: () => void
}

// Long reading lists run to a dozen entries for common characters, which would
// push the card taller than the screen. The first few carry the useful ones.
const READINGS_SHOWN = 4

const face =
  'absolute inset-0 rounded-3xl border border-blue-100 bg-white flex flex-col items-center justify-center px-6 text-center'

// The card is the tallest thing on the screen, and the app disables body
// scrolling, so it gives height back on a short viewport rather than pushing
// the grading buttons under the nav bar. The loading skeleton reuses this.
export const FLASHCARD_HEIGHT = 'h-[clamp(15rem,38dvh,18rem)]'

// Both faces are always in the DOM and rotated apart in 3D, so the flip is one
// continuous turn rather than a swap. The parent supplies the perspective.
const face_style = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const

export function FlashCard({ card, is_flipped, on_flip }: Props) {
  return (
    <div className="w-full" style={{ perspective: '1200px' }}>
      <motion.button
        type="button"
        onClick={on_flip}
        aria-label={is_flipped ? `Hide the meaning of ${card.kanji}` : `Reveal the meaning of ${card.kanji}`}
        aria-pressed={is_flipped}
        className={`relative block w-full ${FLASHCARD_HEIGHT} cursor-pointer`}
        style={{ transformStyle: 'preserve-3d', WebkitUserSelect: 'none', userSelect: 'none' }}
        animate={{ rotateY: is_flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={face} style={face_style}>
          <span className="text-[5.5rem] leading-none font-semibold text-gray-800">
            {card.kanji}
          </span>
          <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest mt-6">
            Tap to reveal
          </span>
        </div>

        <div
          className={face}
          style={{ ...face_style, transform: 'rotateY(180deg)' }}
          // The back is turned away from the viewer until the card flips, and a
          // screen reader should not read it out from behind the front face.
          aria-hidden={!is_flipped}
        >
          <span className="text-3xl font-semibold text-gray-800">{card.kanji}</span>
          <p className="text-lg font-semibold text-tomo-blue leading-snug mt-3">
            {card.meanings.join(', ')}
          </p>
          <div className="w-full max-w-[15rem] flex flex-col gap-2 mt-5">
            <Readings label="訓" caption="kun" readings={card.kun_readings} />
            <Readings label="音" caption="on" readings={card.on_readings} />
          </div>
          <span className="text-[11px] text-gray-400 mt-5">
            {card.stroke_count} stroke{card.stroke_count === 1 ? '' : 's'}
          </span>
        </div>
      </motion.button>
    </div>
  )
}

function Readings({ label, caption, readings }: { label: string; caption: string; readings: string[] }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="shrink-0 w-10 text-[11px] font-semibold text-gray-400 text-right">
        {label} <span className="text-gray-300">{caption}</span>
      </span>
      <span className="flex-1 text-[13px] text-gray-600 text-left leading-snug">
        {readings.length > 0 ? readings.slice(0, READINGS_SHOWN).join('、') : '—'}
      </span>
    </div>
  )
}
