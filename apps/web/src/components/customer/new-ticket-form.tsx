'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const schema = z.object({
  category: z.enum(['order_issue', 'payment', 'account', 'technical', 'other']),
  order_id: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please describe your issue in more detail (at least 20 characters)'),
})
type FormValues = z.infer<typeof schema>

interface Order { id: string; reference: string; status: string }

interface NewTicketFormProps {
  orders: Order[]
  userId: string
}

export function NewTicketForm({ orders, userId }: NewTicketFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'other' },
  })

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: created, error } = await supabase.from('support_tickets').insert({
        user_id: userId,
        category: data.category,
        subject: data.subject,
        description: data.description,
        order_id: data.order_id || null,
      }).select('id').single()
      if (error) throw error

      fetch('/api/notify/ticket-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: created.id }),
      }).catch(() => {})

      toast.success('Ticket submitted — we\'ll respond within 24 hours')
      reset()
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Failed to submit ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm"
      >
        Open New Support Ticket
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Support Ticket</h2>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select
            {...register('category')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="order_issue">Order Issue</option>
            <option value="payment">Payment</option>
            <option value="account">Account</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
        </div>

        {orders.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Related Order (optional)</label>
            <select
              {...register('order_id')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">No specific order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.reference} — {o.status}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <input
            {...register('subject')}
            type="text"
            placeholder="Brief summary of your issue"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
          />
          {errors.subject && <p className="mt-1.5 text-xs text-red-500">{errors.subject.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe your issue in detail..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  )
}
