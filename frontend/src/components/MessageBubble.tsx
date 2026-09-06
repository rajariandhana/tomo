import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Message } from '../types'

type Props = {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const is_ai = message.role === 'ai'
  const [show_en, set_show_en] = useState(false)

  return (
    <motion.div
      className={`flex flex-col ${is_ai ? 'items-start' : 'items-end'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <p
        className={[
          'max-w-[75%] px-4 py-3 text-[15px] leading-relaxed rounded-2xl',
          message.is_error
            ? 'bg-amber-50 border border-amber-200 text-amber-800 rounded-tl-md'
            : is_ai
              ? 'bg-white border border-blue-100 text-gray-800 rounded-tl-md'
              : 'bg-blue-600 text-white rounded-tr-md',
        ].join(' ')}
      >
        {message.content_ja}
        {message.streaming && (
          <span className="inline-block w-[2px] h-[1em] bg-blue-400 ml-0.5 align-middle animate-pulse" />
        )}
      </p>

      {is_ai && !message.streaming && !message.is_error && message.content_en && (
        <div className="mt-1 ml-1">
          <AnimatePresence>
            {show_en && (
              <motion.p
                key="translation"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="text-[13px] text-gray-400 leading-relaxed max-w-[75%] mb-1 overflow-hidden"
              >
                {message.content_en}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            onClick={() => set_show_en(v => !v)}
            className="text-[11px] font-medium text-gray-400 hover:text-blue-500 transition-colors"
          >
            {show_en ? 'Hide translation' : 'Show translation'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
