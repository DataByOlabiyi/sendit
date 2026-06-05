import type { Metadata } from 'next'
import { AdminLoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Admin Login' }

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">SendIt Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Platform administration</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}
