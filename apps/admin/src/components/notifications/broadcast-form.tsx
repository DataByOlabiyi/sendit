'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Audience = 'all' | 'customers' | 'riders'

export function BroadcastForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in title and message')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      let query = supabase.from('users').select('id')
      if (audience === 'customers') query = query.eq('role', 'customer')
      if (audience === 'riders') query = query.eq('role', 'rider')

      const { data: users } = await query

      if (!users || users.length === 0) {
        toast.error('No users found for this audience')
        return
      }

      const notifications = users.map((u) => ({
        user_id: u.id,
        type: 'system' as const,
        title: title.trim(),
        body: body.trim(),
        is_read: false,
      }))

      const { error } = await supabase.from('notifications').insert(notifications)

      if (error) {
        toast.error('Failed to send notifications')
      } else {
        toast.success(`Sent to ${users.length} ${audience === 'all' ? 'users' : audience}`)
        setTitle('')
        setBody('')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
        <div className="flex gap-3">
          {(['all', 'customers', 'riders'] as Audience[]).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                audience === a
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification message..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={isLoading || !title.trim() || !body.trim()}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
      >
        {isLoading ? 'Sending...' : 'Send Notification'}
      </button>
    </div>
  )
}
