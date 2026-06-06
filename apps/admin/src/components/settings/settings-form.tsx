'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import { saveSettingsAction } from '@/app/dashboard/settings/actions'

interface Settings {
  base_fee: number
  per_km_fee: number
  insurance_fee: number
  platform_commission: number
}

interface SettingsFormProps {
  initialSettings: Settings
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [baseFee, setBaseFee] = useState(initialSettings.base_fee)
  const [perKmFee, setPerKmFee] = useState(initialSettings.per_km_fee)
  const [insuranceFee, setInsuranceFee] = useState(initialSettings.insurance_fee)
  const [commissionPct, setCommissionPct] = useState(Math.round(initialSettings.platform_commission * 100))
  const [isSaving, setIsSaving] = useState(false)

  const commission = commissionPct / 100
  const sampleTotal = baseFee + 5 * perKmFee + insuranceFee

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Pricing Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Base Fee (₦)
            </label>
            <input
              type="number"
              value={baseFee}
              min={0}
              onChange={(e) => setBaseFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Flat fee charged on every order</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Per KM Fee (₦)
            </label>
            <input
              type="number"
              value={perKmFee}
              min={0}
              onChange={(e) => setPerKmFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Fee per kilometre of distance</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Insurance Fee (₦)
            </label>
            <input
              type="number"
              value={insuranceFee}
              min={0}
              onChange={(e) => setInsuranceFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Platform Commission (%)
            </label>
            <input
              type="number"
              value={commissionPct}
              min={0}
              max={100}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Riders earn {100 - commissionPct}%</p>
          </div>
        </div>

        {/* Pricing preview */}
        <div className="mt-5 p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Sample pricing (5km order with insurance):</p>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between"><span>Base fee</span><span>{formatCurrency(baseFee)}</span></div>
            <div className="flex justify-between"><span>Distance (5km)</span><span>{formatCurrency(5 * perKmFee)}</span></div>
            <div className="flex justify-between"><span>Insurance</span><span>{formatCurrency(insuranceFee)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-orange-200">
              <span>Total</span><span>{formatCurrency(sampleTotal)}</span>
            </div>
            <div className="flex justify-between text-orange-600 pt-1">
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
          className="w-full mt-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-900">Settings are stored in the database</p>
        <p className="text-xs text-blue-600 mt-1">
          Changes take effect for new orders immediately. Note: the Edge Functions (pricing calculator)
          read from compile-time constants. To apply new prices there, also update{' '}
          <code className="bg-blue-100 px-1 rounded">packages/constants/src/index.ts</code> and redeploy.
        </p>
      </div>
    </div>
  )
}
