'use client'

import { useEffect, useRef, useState } from 'react'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { formatTime } from '@sendit/utils'

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  currentUserId: string
  receiverId: string
  receiverName: string
}

export function ChatDrawer({
  isOpen,
  onClose,
  orderId,
  currentUserId,
  receiverId,
  receiverName,
}: ChatDrawerProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { messages, isLoading, sendMessage, markAsRead } = useRealtimeChat(orderId, currentUserId)

  // Handle iOS keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      if (window.visualViewport) {
        const keyboardH = window.innerHeight - window.visualViewport.height
        setKeyboardHeight(keyboardH > 0 ? keyboardH : 0)
      }
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isOpen) markAsRead()
  }, [isOpen, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || isSending) return
    const text = input.trim()
    setInput('')
    setIsSending(true)
    try {
      const result = await sendMessage(text, receiverId)
      if (result.error) setInput(text)
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed left-0 right-0 bg-white rounded-t-3xl z-50 flex flex-col shadow-2xl"
        style={{
          bottom: keyboardHeight,
          maxHeight: '70vh',
          transition: 'bottom 0.2s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-500">
                {receiverName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{receiverName}</p>
              <p className="text-xs text-gray-400">Chat about your delivery</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close chat" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition touch-manipulation">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-hide">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUserId
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isOwn ? 'bg-orange-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-gray-400'}`}>
                      {formatTime(message.created_at)}
                      {isOwn && message.is_read && ' · Read'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-end gap-3 shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 max-h-24 scrollbar-hide"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="Send message"
            className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl flex items-center justify-center transition shrink-0 touch-manipulation"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
