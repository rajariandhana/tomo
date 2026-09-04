import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { MessageBubble } from '../components/MessageBubble'
import { TypingIndicator } from '../components/TypingIndicator'
import { TopicIcon } from '../components/TopicIcon'
import { get_topic } from '../lib/topics'
import { start_conversation, send_message } from '../lib/api'
import type { Message } from '../types'

export function Conversation() {
  const { topic_key } = useParams<{ topic_key: string }>()
  const navigate = useNavigate()
  const topic = get_topic(topic_key ?? '')

  const [messages, set_messages] = useState<Message[]>([])
  const [conversation_id, set_conversation_id] = useState<string | null>(null)
  const [input, set_input] = useState('')
  const [is_ai_typing, set_is_ai_typing] = useState(true)

  const scroll_ref = useRef<HTMLDivElement>(null)
  const textarea_ref = useRef<HTMLTextAreaElement>(null)

  const scroll_to_bottom = () => {
    const el = scroll_ref.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const adjust_textarea = () => {
    const el = textarea_ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  useEffect(() => {
    let cancelled = false
    set_is_ai_typing(true)
    start_conversation({ topic_key: topic_key ?? '' })
      .then(data => {
        if (cancelled) return
        set_is_ai_typing(false)
        set_conversation_id(data.conversation_id)
        set_messages([{
          id: crypto.randomUUID(),
          role: 'ai',
          content_ja: data.first_message_ja,
          content_en: data.first_message_en,
          created_at: Date.now(),
        }])
      })
      .catch(() => { if (!cancelled) set_is_ai_typing(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scroll_to_bottom()
  }, [messages, is_ai_typing])

  const send_mutation = useMutation({
    mutationFn: (msg: string) => send_message(conversation_id!, { message: msg }),
    onMutate: (msg: string) => {
      set_messages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content_ja: msg,
        created_at: Date.now(),
      }])
      set_is_ai_typing(true)
      set_input('')
      if (textarea_ref.current) {
        textarea_ref.current.style.height = 'auto'
      }
    },
    onSuccess: data => {
      set_is_ai_typing(false)
      set_messages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content_ja: data.reply_ja,
        content_en: data.reply_en,
        created_at: Date.now(),
      }])
    },
    onError: () => set_is_ai_typing(false),
  })

  const is_blocked = is_ai_typing || !conversation_id

  const handle_submit = () => {
    const trimmed = input.trim()
    if (!trimmed || is_blocked) return
    send_mutation.mutate(trimmed)
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit()
    }
  }

  return (
    <div className="flex justify-center bg-white min-h-dvh">
      <div className="w-full max-w-md h-dvh flex flex-col bg-white">

        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center gap-3 px-4 border-b border-gray-100"
          style={{ height: '56px', paddingTop: 'env(safe-area-inset-top)' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 -ml-1 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <TopicIcon topic_key={topic_key ?? ''} size={18} className="text-blue-500 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold text-gray-800">
              {topic?.en ?? 'Conversation'}
            </span>
            <span className="text-xs text-gray-400">{topic?.ja}</span>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scroll_ref}
          className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3"
        >
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <AnimatePresence>
            {is_ai_typing && <TypingIndicator key="typing" />}
          </AnimatePresence>
          <div className="shrink-0 h-1" />
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 flex items-end gap-2 px-4 pt-3 border-t border-gray-100"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <textarea
            ref={textarea_ref}
            value={input}
            onChange={e => {
              set_input(e.target.value)
              adjust_textarea()
            }}
            onKeyDown={handle_key_down}
            placeholder="Type a message..."
            rows={1}
            disabled={is_blocked}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-300 transition-colors disabled:opacity-40 leading-relaxed"
          />
          <button
            onClick={handle_submit}
            disabled={is_blocked || !input.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 9H14.5M14.5 9L10 4.5M14.5 9L10 13.5"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}
