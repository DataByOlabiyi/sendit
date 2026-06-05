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

export function useRealtimeChat(orderId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useRef(createClient())

  useEffect(() => {
    let ignore = false

    async function fetchMessages() {
      const { data } = await supabase.current
        .from('chat_messages')
        .select('id, order_id, sender_id, receiver_id, message, is_read, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (!ignore) {
        setMessages(data ?? [])
        setIsLoading(false)
      }
    }

    fetchMessages()

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
        }
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
            prev.map((m) => (m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m))
          )
        }
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.current.removeChannel(channel)
    }
  }, [orderId])

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
    [orderId, currentUserId]
  )

  const markAsRead = useCallback(async () => {
    await supabase.current
      .from('chat_messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
  }, [orderId, currentUserId])

  return { messages, isLoading, sendMessage, markAsRead }
}
