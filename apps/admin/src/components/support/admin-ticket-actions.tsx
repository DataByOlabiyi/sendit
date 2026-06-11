'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AdminTicketActionsProps {
  ticketId: string
  currentStatus: string
  adminId: string
}

export function AdminTicketActions({ ticketId, currentStatus, adminId }: AdminTicketActionsProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  async function sendReply() {
    if (!message.trim()) return
    setIsSending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: adminId,
        message: message.trim(),
        is_staff: true,
      })
      if (error) throw error

      if (currentStatus === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId)
      }

      toast.success('Reply sent')
      setMessage('')
      router.refresh()
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setIsSending(false)
    }
  }

  async function updateStatus(newStatus: string) {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      const update: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'resolved') update.resolved_at = new Date().toISOString()

      const { error } = await supabase.from('support_tickets').update(update).eq('id', ticketId)
      if (error) throw error

      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`)
      router.refresh()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Reply to customer</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Type your reply..."
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
      />
      <div className="flex gap-3">
        <button
          onClick={sendReply}
          disabled={isSending || !message.trim()}
          className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
        >
          {isSending ? 'Sending...' : 'Send Reply'}
        </button>
        {currentStatus !== 'resolved' && (
          <button
            onClick={() => updateStatus('resolved')}
            disabled={isUpdating}
            className="px-4 py-2.5 border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-60 text-sm font-semibold rounded-xl transition"
          >
            Mark Resolved
          </button>
        )}
        <button
          onClick={() => updateStatus('closed')}
          disabled={isUpdating}
          className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 text-sm font-semibold rounded-xl transition"
        >
          Close
        </button>
      </div>
    </div>
  )
}
