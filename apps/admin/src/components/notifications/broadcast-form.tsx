'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Audience = 'all' | 'customers' | 'riders'

interface BroadcastResult {
  audience: Audience
  count: number
  title: string
  sentAt: string
}

export function BroadcastForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null)
  const [history, setHistory] = useState<BroadcastResult[]>([])

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
        const result: BroadcastResult = {
          audience,
          count: users.length,
          title: title.trim(),
          sentAt: new Date().toISOString(),
        }
        setLastResult(result)
        setHistory((prev) => [result, ...prev].slice(0, 10))
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
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <span className={`text-xs ${body.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{body.length}/160</span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification message..."
          rows={4}
          maxLength={200}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={isLoading || !title.trim() || !body.trim()}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending...
          </span>
        ) : (
          'Send Notification'
        )}
      </button>

      {/* Last broadcast result */}
      {lastResult && (
        <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-green-800">Broadcast delivered</p>
          </div>
          <p className="text-xs text-green-700">
            &ldquo;{lastResult.title}&rdquo; sent to <strong>{lastResult.count.toLocaleString()}</strong>{' '}
            {lastResult.audience === 'all' ? 'users' : lastResult.audience}
          </p>
          <p className="text-xs text-green-500 mt-0.5">
            {new Date(lastResult.sentAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      )}

      {/* Session history */}
      {history.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sent this session</p>
          <div className="space-y-2">
            {history.slice(1).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{r.audience} · {r.count} sent</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0 ml-4">
                  {new Date(r.sentAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
