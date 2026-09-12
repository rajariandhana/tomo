import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { TopicCard } from '../components/TopicCard'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { GuideSteps } from '../components/GuideSteps'
import { PageLayout } from '../layouts/PageLayout'
import { pick_random_topics } from '../lib/topics'
import type { Topic } from '../types'

export function TopicSelection() {
  const navigate = useNavigate()
  const [topics] = useState<Topic[]>(() => pick_random_topics(4))
  const [is_navigating, set_is_navigating] = useState(false)
  const [is_guide_open, set_is_guide_open] = useState(false)

  const handle_select = (topic: Topic) => {
    if (is_navigating) return
    set_is_navigating(true)
    setTimeout(() => navigate('/conversation', { state: { topic } }), 220)
  }

  const show_content = !is_navigating

  return (
    <PageLayout className="min-h-dvh flex flex-col">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 tracking-tight">Tomo</h1>
        <p className="text-sm text-gray-400 mt-1.5">日本語を話しましょう</p>
      </header>

      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4 text-center">
        Choose a topic
      </p>

      <AnimatePresence mode="wait">
        {show_content && (
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

      {show_content && (
        <div className="mt-auto pt-8">
          <Button
            variant="secondary"
            onClick={() => set_is_guide_open(true)}
            className="flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.25c-.75.36-1.1.9-1.1 1.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
            </svg>
            How Tomo works
          </Button>
        </div>
      )}

      <Modal
        open={is_guide_open}
        title="Guide"
        subtitle="How Tomo works"
        on_close={() => set_is_guide_open(false)}
      >
        <GuideSteps />
      </Modal>
    </PageLayout>
  )
}
