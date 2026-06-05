'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'

export function SettingsForm() {
  const [baseFee, setBaseFee] = useState(500)
  const [perKmFee, setPerKmFee] = useState(100)
  const [insuranceFee, setInsuranceFee] = useState(200)
  const [commission, setCommission] = useState(15)
  const [isSaving, setIsSaving] = useState(false)

  function handleSave() {
    setIsSaving(true)
    setTimeout(() => {
      toast.success('Settings saved. Note: To persist these values, update the constants in packages/constants/src/index.ts')
      setIsSaving(false)
    }, 800)
  }

  const sampleTotal = baseFee + (5 * perKmFee) + insuranceFee

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
              onChange={(e) => setPerKmFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Fee per kilometer of distance</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Insurance Fee (₦)
            </label>
            <input
              type="number"
              value={insuranceFee}
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
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Riders earn {100 - commission}%</p>
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
              <span>Platform ({commission}%)</span><span>{formatCurrency(sampleTotal * commission / 100)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Rider ({100 - commission}%)</span><span>{formatCurrency(sampleTotal * (100 - commission) / 100)}</span>
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
        <p className="text-sm font-medium text-yellow-800">Production Note</p>
        <p className="text-xs text-yellow-600 mt-1">
          To persist pricing changes in production, update <code className="bg-yellow-100 px-1 rounded">packages/constants/src/index.ts</code> with the new values and redeploy. A database-driven settings table can be added in a future iteration.
        </p>
      </div>
    </div>
  )
}
