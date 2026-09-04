import { motion } from 'framer-motion'
import { TopicIcon } from './TopicIcon'
import type { Topic } from '../types'

type Props = {
  topic: Topic
  on_click: (topic: Topic) => void
  disabled?: boolean
}

export function TopicCard({ topic, on_click, disabled }: Props) {
  return (
    <motion.button
      onClick={() => !disabled && on_click(topic)}
      disabled={disabled}
      className="flex flex-col items-center justify-center w-full aspect-[3/4] p-5 bg-white border border-blue-100 rounded-2xl text-center cursor-pointer gap-3"
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <TopicIcon topic_key={topic.key} size={32} className="text-blue-500" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-gray-400 leading-snug">{topic.ja}</span>
        <span className="text-[15px] font-semibold text-blue-600 leading-snug">{topic.en}</span>
      </div>
    </motion.button>
  )
}
