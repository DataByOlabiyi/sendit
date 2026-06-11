'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CustomerTicketReplyProps {
  ticketId: string
  userId: string
}

export function CustomerTicketReply({ ticketId, userId }: CustomerTicketReplyProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const router = useRouter()

  async function handleSend() {
    if (!message.trim()) return
    setIsSending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message: message.trim(),
        is_staff: false,
      })
      if (error) throw error

      toast.success('Reply sent')
      setMessage('')
      router.refresh()
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Add a reply</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Type your message..."
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
      />
      <button
        onClick={handleSend}
        disabled={isSending || !message.trim()}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
      >
        {isSending ? 'Sending...' : 'Send Reply'}
      </button>
    </div>
  )
}
