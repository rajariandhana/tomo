import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { TopicCard } from '../components/TopicCard'
import { pick_random_topics } from '../lib/topics'
import type { Topic } from '../types'

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'animate-spin' : ''}
      style={spinning ? { animationDirection: 'reverse' } : undefined}
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.96" />
    </svg>
  )
}

export function TopicSelection() {
  const navigate = useNavigate()
  const [topics, set_topics] = useState<Topic[]>(() => pick_random_topics(4))
  const [is_refreshing, set_is_refreshing] = useState(false)
  const [is_navigating, set_is_navigating] = useState(false)

  const handle_select = (topic: Topic) => {
    if (is_navigating || is_refreshing) return
    set_is_navigating(true)
    setTimeout(() => navigate(`/conversation/${topic.key}`), 220)
  }

  const handle_refresh = async () => {
    if (is_refreshing || is_navigating) return
    set_is_refreshing(true)
    await new Promise(r => setTimeout(r, 650 + Math.random() * 350))
    set_topics(pick_random_topics(4))
    set_is_refreshing(false)
  }

  const show_content = !is_navigating

  return (
    <div className="min-h-dvh bg-white flex justify-center">
      <div className="w-full max-w-md px-5 pt-14 pb-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-blue-600 tracking-tight">Tomo</h1>
          <p className="text-sm text-gray-400 mt-1.5">日本語を話しましょう</p>
        </header>

        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4 text-center">
          Choose a topic
        </p>

        <AnimatePresence mode="wait">
          {show_content && is_refreshing && (
            <motion.div
              key="skeleton"
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-full aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse"
                />
              ))}
            </motion.div>
          )}

          {show_content && !is_refreshing && (
            <motion.div
              key="cards"
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              {topics.map((topic, i) => (
                <motion.div
                  key={topic.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22, ease: 'easeOut' }}
                >
                  <TopicCard topic={topic} on_click={handle_select} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {show_content && (
            <motion.div
              className="flex justify-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25, duration: 0.2 }}
            >
              <button
                onClick={handle_refresh}
                disabled={is_refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:pointer-events-none"
                aria-label="Shuffle topics"
              >
                <RefreshIcon spinning={is_refreshing} />
                <span className="text-[11px] font-semibold uppercase tracking-widest">
                  Shuffle
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
