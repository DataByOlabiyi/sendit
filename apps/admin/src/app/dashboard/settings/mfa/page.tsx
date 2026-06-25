import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MfaSetup } from '@/components/settings/mfa-setup'

export const metadata: Metadata = { title: 'Two-Factor Authentication' }

export default async function MfaSettingsPage() {
  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()

  const totpFactor = factors?.totp?.[0]
  const isEnrolled = !!totpFactor && totpFactor.status === 'verified'

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-2 flex items-center gap-2">
        <a href="/dashboard/settings" className="text-sm text-gray-500 hover:text-gray-700 transition">
          Settings
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Two-Factor Authentication</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
        <p className="text-sm text-gray-500 mt-1">
          Protect your admin account with a time-based one-time password (TOTP).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <MfaSetup
          isEnrolled={isEnrolled}
          factorId={totpFactor?.id}
        />
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <p className="text-sm text-amber-800">
          <strong>Recommended:</strong> Once enabled, every admin login will require both your
          password and the 6-digit code from your authenticator app. Store your backup codes
          in a safe place in case you lose access to your device.
        </p>
      </div>
    </div>
  )
}
