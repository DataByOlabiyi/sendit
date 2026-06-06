'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  order_id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  created_at: string
}

const PAGE_SIZE = 50

export function useRealtimeChat(orderId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Cursor tracks the oldest message we've fetched (for pagination)
  const oldestCreatedAt = useRef<string | null>(null)
  const supabase = useRef(createClient())

  // Fetch the most recent PAGE_SIZE messages on mount
  useEffect(() => {
    let ignore = false

    async function fetchInitialMessages() {
      const { data } = await supabase.current
        .from('chat_messages')
        .select('id, order_id, sender_id, receiver_id, message, is_read, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (ignore) return

      if (data) {
        // Data comes back newest-first; reverse for chronological display
        const chronological = [...data].reverse()
        setMessages(chronological)
        oldestCreatedAt.current = chronological[0]?.created_at ?? null
        setHasMore(data.length === PAGE_SIZE)
      }
      setIsLoading(false)
    }

    fetchInitialMessages()

    // Subscribe to new inserts and read-receipt updates
    const channel = supabase.current
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.current.removeChannel(channel)
    }
  }, [orderId])

  // Fetch an older page of messages (cursor-based, ascending order preserved)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !oldestCreatedAt.current) return

    setIsLoadingMore(true)
    const { data } = await supabase.current
      .from('chat_messages')
      .select('id, order_id, sender_id, receiver_id, message, is_read, created_at')
      .eq('order_id', orderId)
      .lt('created_at', oldestCreatedAt.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data) {
      const chronological = [...data].reverse()
      setMessages((prev) => [...chronological, ...prev])
      oldestCreatedAt.current = chronological[0]?.created_at ?? oldestCreatedAt.current
      setHasMore(data.length === PAGE_SIZE)
    }
    setIsLoadingMore(false)
  }, [orderId, hasMore, isLoadingMore])

  const sendMessage = useCallback(
    async (text: string, receiverId: string) => {
      const { error } = await supabase.current.from('chat_messages').insert({
        order_id: orderId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: text,
      })
      return { error: error?.message }
    },
    [orderId, currentUserId],
  )

  const markAsRead = useCallback(async () => {
    await supabase.current
      .from('chat_messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
  }, [orderId, currentUserId])

  return { messages, isLoading, hasMore, isLoadingMore, loadMore, sendMessage, markAsRead }
}
