'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { formatTime } from '@sendit/utils'

interface ChatPageProps {
  orderId: string
  currentUserId: string
  receiverId: string
  receiverName: string
  orderAddress: string
}

export function ChatPage({ orderId, currentUserId, receiverId, receiverName, orderAddress }: ChatPageProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [optimisticMessages, setOptimisticMessages] = useState<{ id: string; message: string; created_at: string }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, hasMore, isLoadingMore, loadMore, sendMessage, markAsRead } = useRealtimeChat(orderId, currentUserId)

  useEffect(() => { markAsRead() }, [messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || isSending) return
    const text = input.trim()
    setInput('')
    setIsSending(true)

    // Optimistic insert — message appears immediately, removed if send fails
    const tempId = `temp-${Date.now()}`
    setOptimisticMessages((prev) => [...prev, { id: tempId, message: text, created_at: new Date().toISOString() }])

    try {
      const result = await sendMessage(text, receiverId)
      if (result.error) {
        setInput(text)
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId))
      } else {
        // Realtime will confirm the insert; drop the optimistic copy
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
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

  return (
    <div className="flex flex-col h-dvh lg:h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <Link href={`/orders/${orderId}`} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition touch-manipulation">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-orange-500">{receiverName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{receiverName}</p>
          <p className="text-xs text-gray-400 truncate">{orderAddress}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-3 scrollbar-hide">
        {/* Load earlier messages */}
        {hasMore && !isLoading && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-xs font-medium text-gray-600 rounded-full hover:border-orange-300 transition disabled:opacity-50"
            >
              {isLoadingMore ? (
                <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              )}
              {isLoadingMore ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 && optimisticMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Start the conversation</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to {receiverName}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId
              const prevMessage = messages[index - 1]
              const showDate = !prevMessage ||
                new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString()
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {new Date(message.created_at).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                      isOwn ? 'bg-orange-500 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-gray-400'}`}>
                        {formatTime(message.created_at)}
                        {isOwn && message.is_read && ' · Read'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Optimistic messages (not yet confirmed by Realtime) */}
            {optimisticMessages.map((msg) => (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[78%] px-4 py-2.5 rounded-2xl bg-orange-400 text-white rounded-br-md opacity-70">
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className="text-xs mt-1 text-orange-100">Sending...</p>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3 shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${receiverName}...`}
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 max-h-28 scrollbar-hide"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl flex items-center justify-center transition shrink-0 touch-manipulation"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
