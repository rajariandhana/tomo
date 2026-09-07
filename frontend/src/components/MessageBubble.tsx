import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Message } from '../types'
import { text_to_speech } from '../lib/api'

type Props = {
  message: Message
}

type Audio_status = 'idle' | 'loading' | 'playing' | 'error'

export function MessageBubble({ message }: Props) {
  const is_ai = message.role === 'ai'
  const [show_en, set_show_en] = useState(false)
  const [audio_status, set_audio_status] = useState<Audio_status>('idle')
  const audio_ref = useRef<HTMLAudioElement | null>(null)
  const audio_url_ref = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      audio_ref.current?.pause()
      if (audio_url_ref.current) URL.revokeObjectURL(audio_url_ref.current)
    }
  }, [])

  const handle_play = async () => {
    if (audio_status === 'loading') return

    if (audio_ref.current && audio_status === 'playing') {
      audio_ref.current.pause()
      audio_ref.current.currentTime = 0
      set_audio_status('idle')
      return
    }

    if (audio_ref.current) {
      set_audio_status('playing')
      audio_ref.current.currentTime = 0
      audio_ref.current.play().catch(() => set_audio_status('error'))
      return
    }

    set_audio_status('loading')
    try {
      const blob = await text_to_speech(message.content_ja)
      const url = URL.createObjectURL(blob)
      audio_url_ref.current = url
      const audio = new Audio(url)
      audio.onended = () => set_audio_status('idle')
      audio.onerror = () => set_audio_status('error')
      audio_ref.current = audio
      await audio.play()
      set_audio_status('playing')
    } catch {
      set_audio_status('error')
      setTimeout(() => set_audio_status('idle'), 1500)
    }
  }

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

      {message.is_error && message.content_en && (
        <p className="mt-1.5 ml-1 text-[13px] text-amber-700/80 leading-relaxed max-w-[75%]">
          {message.content_en}
        </p>
      )}

      {is_ai && !message.streaming && !message.is_error && (
        <div className="mt-1 ml-1">
          {message.content_en && (
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
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handle_play}
              disabled={audio_status === 'loading'}
              className={[
                'flex items-center justify-center w-6 h-6 -ml-1 rounded-full transition-colors disabled:opacity-50',
                audio_status === 'error' ? 'text-amber-500' : 'text-gray-400 hover:text-blue-500',
              ].join(' ')}
              aria-label={audio_status === 'playing' ? 'Stop audio' : 'Play audio'}
            >
              {audio_status === 'loading' ? (
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : audio_status === 'playing' ? (
                <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="2" y="2" width="4" height="10" rx="1" />
                  <rect x="8" y="2" width="4" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7.5v5h3.2L10 16V4L6.2 7.5H3Z" fill="currentColor" />
                  <path d="M13 7.2a3.2 3.2 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {message.content_en && (
              <button
                onClick={() => set_show_en(v => !v)}
                className="text-[11px] font-medium text-gray-400 hover:text-blue-500 transition-colors"
              >
                {show_en ? 'Hide translation' : 'Show translation'}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
