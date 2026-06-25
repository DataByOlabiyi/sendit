import type { Metadata } from 'next'
import { MfaForm } from '@/components/auth/mfa-form'

export const metadata: Metadata = { title: 'Two-Factor Authentication' }

export default function MfaChallengePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Two-Factor Auth</h1>
          <p className="text-sm text-gray-400 mt-1">Enter the code from your authenticator app</p>
        </div>
        <MfaForm />
        <p className="text-center text-xs text-gray-600 mt-6">
          Lost access to your authenticator?{' '}
          <a href="mailto:support@sendit.ng" className="text-gray-400 hover:text-gray-300 transition">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
