import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
