import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { KANJI_MODES } from '../lib/kanji'

export function KanjiModes() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">Kanji</h1>
        <p className="text-sm text-gray-400 mt-1.5">漢字を学びましょう</p>
      </header>

      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4 text-center">
        Choose a mode
      </p>

      <div className="flex flex-col gap-3">
        {KANJI_MODES.map((mode, i) => (
          <motion.button
            key={mode.key}
            onClick={() => mode.available && navigate(`/kanji/${mode.key}/level`)}
            disabled={!mode.available}
            className="w-full text-left p-5 bg-white border border-blue-100 rounded-2xl cursor-pointer disabled:cursor-default disabled:opacity-50"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.22, ease: 'easeOut' }}
            whileHover={mode.available ? { scale: 1.015 } : undefined}
            whileTap={mode.available ? { scale: 0.97 } : undefined}
            style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-tomo-blue">{mode.label}</span>
              <span className="text-xs text-gray-400">{mode.ja}</span>
              {!mode.available && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Coming soon
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mt-1">{mode.blurb}</p>
          </motion.button>
        ))}
      </div>
    </PageLayout>
  )
}
