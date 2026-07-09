'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import { saveSettingsAction } from '@/app/dashboard/settings/actions'
import { createClient } from '@/lib/supabase/client'
import { PushNotificationToggle } from '@sendit/ui'

interface Settings {
  base_fee: number
  per_km_fee: number
  insurance_fee: number
  platform_commission: number
}

interface AdminProfile {
  full_name: string
  email: string
  created_at: string
}

interface SettingsFormProps {
  initialSettings: Settings
  adminProfile: AdminProfile
}

export function SettingsForm({ initialSettings, adminProfile }: SettingsFormProps) {
  const [baseFee, setBaseFee] = useState(initialSettings.base_fee)
  const [perKmFee, setPerKmFee] = useState(initialSettings.per_km_fee)
  const [insuranceFee, setInsuranceFee] = useState(initialSettings.insurance_fee)
  const [commissionPct, setCommissionPct] = useState(Math.round(initialSettings.platform_commission * 100))
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const commission = commissionPct / 100
  const sampleTotal = baseFee + 5 * perKmFee + insuranceFee

  const initials = adminProfile.full_name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const memberSince = new Date(adminProfile.created_at).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })

  async function handleSave() {
    if (commissionPct < 0 || commissionPct > 100) {
      toast.error('Commission must be between 0% and 100%')
      return
    }
    setIsSaving(true)
    try {
      const result = await saveSettingsAction({
        base_fee: baseFee,
        per_km_fee: perKmFee,
        insurance_fee: insuranceFee,
        platform_commission: commission,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Settings saved successfully')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordReset() {
    setIsSendingReset(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(adminProfile.email)
      if (error) throw error
      toast.success('Password reset email sent — check your inbox')
    } catch {
      toast.error('Failed to send reset email')
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Admin Account */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          <div aria-hidden="true" className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-orange-500">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-lg font-semibold text-gray-900 truncate">{adminProfile.full_name}</p>
            <p className="text-sm text-gray-500 truncate">{adminProfile.email}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Administrator
              </span>
              <span className="text-xs text-gray-400">Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Configuration */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Pricing Configuration</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Changes apply to new orders immediately. Update the Edge Function constants to sync pricing there too.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Fee (₦)</label>
            <input
              type="number"
              value={baseFee}
              min={0}
              onChange={(e) => setBaseFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Flat fee charged on every order</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Per KM Fee (₦)</label>
            <input
              type="number"
              value={perKmFee}
              min={0}
              onChange={(e) => setPerKmFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Fee per kilometre of distance</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Fee (₦)</label>
            <input
              type="number"
              value={insuranceFee}
              min={0}
              onChange={(e) => setInsuranceFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Optional insurance add-on per order</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform Commission (%)</label>
            <input
              type="number"
              value={commissionPct}
              min={0}
              max={100}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Riders earn {100 - commissionPct}% of each order</p>
          </div>
        </div>

        {/* Live pricing preview */}
        <div className="mt-5 p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-xs font-semibold text-gray-700 mb-3">Sample pricing — 5 km order with insurance</p>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between"><span>Base fee</span><span>{formatCurrency(baseFee)}</span></div>
            <div className="flex justify-between"><span>Distance (5 km)</span><span>{formatCurrency(5 * perKmFee)}</span></div>
            <div className="flex justify-between"><span>Insurance</span><span>{formatCurrency(insuranceFee)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-orange-200">
              <span>Customer pays</span><span>{formatCurrency(sampleTotal)}</span>
            </div>
            <div className="flex justify-between text-orange-600 pt-1.5">
              <span>Platform ({commissionPct}%)</span><span>{formatCurrency(sampleTotal * commission)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Rider ({100 - commissionPct}%)</span><span>{formatCurrency(sampleTotal * (1 - commission))}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-5 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Edge Function note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-medium text-blue-900">Settings are stored in the database</p>
        <p className="text-xs text-blue-600 mt-1">
          To apply new prices in Edge Functions, also update{' '}
          <code className="bg-blue-100 px-1 rounded">packages/constants/src/index.ts</code> and redeploy.
        </p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Get alerted about KYC submissions, disputes, tickets, and payment issues on this device</p>
        <PushNotificationToggle />
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Manage your admin account password and two-factor authentication</p>
        <div className="space-y-3">
          <button
            onClick={handlePasswordReset}
            disabled={isSendingReset}
            type="button"
            className="w-full py-3 border border-gray-200 hover:border-gray-300 active:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            {isSendingReset ? 'Sending…' : 'Send Password Reset Email'}
          </button>
          <a
            href="/dashboard/settings/mfa"
            className="flex items-center justify-between w-full py-3 px-4 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <span>Two-Factor Authentication (MFA)</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Reset link will be sent to {adminProfile.email}</p>
      </div>

    </div>
  )
}
