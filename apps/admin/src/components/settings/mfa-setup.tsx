'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { adminMfaEnrollAction, adminMfaConfirmAction, adminMfaUnenrollAction } from '@/app/auth/actions'

interface MfaSetupProps {
  isEnrolled: boolean
  factorId?: string
}

export function MfaSetup({ isEnrolled, factorId }: MfaSetupProps) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'verifying'>('idle')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [enrollFactorId, setEnrollFactorId] = useState<string>('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleStartEnroll() {
    setIsLoading(true)
    try {
      const result = await adminMfaEnrollAction()
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setQrCode(result.qrCode)
      setSecret(result.secret)
      setEnrollFactorId(result.factorId)
      setPhase('scanning')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from your authenticator app.')
      return
    }
    setIsLoading(true)
    try {
      const result = await adminMfaConfirmAction(enrollFactorId, code)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('MFA enabled — your account is now protected with two-factor authentication.')
      // Reload so the page reflects the new enrolled state
      window.location.reload()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnenroll() {
    if (!factorId) return
    if (!confirm('Remove MFA from your account? You will only need your password to log in.')) return
    setIsLoading(true)
    try {
      const result = await adminMfaUnenrollAction(factorId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('MFA removed.')
      window.location.reload()
    } finally {
      setIsLoading(false)
    }
  }

  if (isEnrolled) {
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm font-medium text-gray-900">Two-factor authentication is enabled</p>
          </div>
          <p className="text-sm text-gray-500">
            Your account requires a 6-digit code from your authenticator app on every login.
          </p>
        </div>
        <button
          onClick={handleUnenroll}
          disabled={isLoading}
          className="ml-6 shrink-0 px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition"
        >
          {isLoading ? 'Removing…' : 'Remove MFA'}
        </button>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <p className="text-sm font-medium text-gray-900">Two-factor authentication is not enabled</p>
          </div>
          <p className="text-sm text-gray-500">
            Add an extra layer of security. You&apos;ll need an authenticator app (Google Authenticator, Authy, etc.).
          </p>
        </div>
        <button
          onClick={handleStartEnroll}
          disabled={isLoading}
          className="ml-6 shrink-0 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 transition"
        >
          {isLoading ? 'Loading…' : 'Enable MFA'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">Step 1 — Scan this QR code</p>
        <p className="text-sm text-gray-500 mb-4">
          Open your authenticator app and scan the code below, or enter the secret manually.
        </p>
        {qrCode && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrCode}
            alt="MFA QR code"
            className="w-44 h-44 border border-gray-200 rounded-xl"
          />
        )}
        {secret && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
            <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono text-gray-700 select-all">
              {secret}
            </code>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">Step 2 — Verify the code</p>
        <p className="text-sm text-gray-500 mb-3">
          Enter the 6-digit code your authenticator app shows for this account.
        </p>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-36 px-4 py-2.5 rounded-xl border border-gray-200 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleConfirm}
            disabled={isLoading || code.length !== 6}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 transition"
          >
            {isLoading ? 'Verifying…' : 'Activate MFA'}
          </button>
          <button
            onClick={() => setPhase('idle')}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
