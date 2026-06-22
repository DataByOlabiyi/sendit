'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setInstallPrompt(null)
  }

  function handleDismiss() {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!isVisible || isDismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install SendIt</p>
          <p className="text-xs text-gray-500 mt-0.5">Add to your home screen for faster access</p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition"
        >
          Install
        </button>
      </div>
    </div>
  )
}
