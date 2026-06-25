'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { adminMfaVerifyAction } from '@/app/auth/actions'

export function MfaForm() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from your authenticator app.')
      return
    }
    setIsLoading(true)
    try {
      const result = await adminMfaVerifyAction(code)
      if (result?.error) {
        toast.error(result.error)
        setCode('')
      }
    } catch (err) {
      if (
        err instanceof Error &&
        'digest' in err &&
        String((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')
      ) {
        throw err
      }
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
            Authenticator code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            autoComplete="one-time-code"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal"
          />
          <p className="mt-2 text-xs text-gray-500">
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  )
}
