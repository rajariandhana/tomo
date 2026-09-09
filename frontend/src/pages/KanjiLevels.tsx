import { Navigate, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { JLPT_LEVELS, KANJI_MODES } from '../lib/kanji'

export function KanjiLevels() {
  const navigate = useNavigate()
  const { mode } = useParams()

  const selected_mode = KANJI_MODES.find(m => m.key === mode && m.available)
  if (!selected_mode) return <Navigate to="/kanji" replace />

  return (
    <PageLayout show_back back_to="/kanji">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">{selected_mode.label}</h1>
        <p className="text-sm text-gray-400 mt-1.5">{selected_mode.ja}</p>
      </header>

      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">
        Choose a level
      </p>
      <p className="text-xs text-gray-400 text-center mb-5 leading-relaxed">
        N5 is the easiest and N1 is the hardest.
      </p>

      <div className="flex flex-col gap-3">
        {JLPT_LEVELS.map((entry, i) => (
          <motion.button
            key={entry.level}
            onClick={() => navigate(`/kanji/${selected_mode.key}/play/${entry.level}`)}
            className="w-full flex items-center gap-4 p-4 bg-white border border-blue-100 rounded-2xl text-left cursor-pointer"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22, ease: 'easeOut' }}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
          >
            <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-sm font-bold text-tomo-blue">{entry.level}</span>
            </div>
            <span className="text-sm text-gray-500 leading-snug">{entry.blurb}</span>
          </motion.button>
        ))}
      </div>
    </PageLayout>
  )
}
