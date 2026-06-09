'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeStatusBanner() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('_connection_monitor')
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('connected')
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('disconnected')
          // Attempt reconnect after a short delay
          setTimeout(() => setStatus('reconnecting'), 500)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (status === 'connected') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-white transition-colors ${
        status === 'reconnecting' ? 'bg-orange-500' : 'bg-red-500'
      }`}
    >
      {status === 'reconnecting' ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Reconnecting to live updates...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Connection lost — live updates paused
        </>
      )}
    </div>
  )
}
