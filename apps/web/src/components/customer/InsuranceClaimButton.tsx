'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import { fileInsuranceClaimAction } from '@/app/(customer)/orders/[id]/actions'

interface InsuranceClaimButtonProps {
  orderId: string
  totalFee: number
  existingClaim?: { status: string } | null
}

export function InsuranceClaimButton({ orderId, totalFee, existingClaim }: InsuranceClaimButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [filed, setFiled] = useState(!!existingClaim)
  const [claimStatus, setClaimStatus] = useState(existingClaim?.status ?? null)

  if (filed) {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      under_review: 'bg-blue-50 border-blue-200 text-blue-800',
      approved: 'bg-green-50 border-green-200 text-green-800',
      paid: 'bg-green-50 border-green-200 text-green-800',
      rejected: 'bg-red-50 border-red-200 text-red-800',
    }
    return (
      <div className={`w-full py-3 px-4 border rounded-2xl text-center ${colors[claimStatus ?? 'pending']}`}>
        <p className="text-sm font-medium capitalize">Insurance Claim: {claimStatus?.replace('_', ' ')}</p>
        <p className="text-xs mt-0.5 opacity-80">Our team will review your claim and contact you via email</p>
      </div>
    )
  }

  async function handleSubmit() {
    const amount = parseFloat(claimAmount)
    if (!amount || amount < 100) { toast.error('Minimum claim amount is ₦100'); return }
    if (description.length < 20) { toast.error('Please describe the issue in at least 20 characters'); return }

    setIsLoading(true)
    try {
      const result = await fileInsuranceClaimAction({
        orderId,
        claimAmount: Math.round(amount * 100),
        description,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Insurance claim filed successfully!')
      setFiled(true)
      setClaimStatus('pending')
      setShowModal(false)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 border-2 border-blue-200 text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 transition text-sm"
      >
        File Insurance Claim
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-1">File Insurance Claim</h2>
            <p className="text-xs text-gray-500 mb-5">
              Describe the issue and the amount you're claiming. Our team will review within 3–5 business days.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">What happened?</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the damage, loss, or issue with the delivery..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Claim Amount (₦) — Order value: {formatCurrency(totalFee)}
                </label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="Enter amount in Naira"
                  min="100"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || description.length < 20 || !claimAmount}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
              >
                {isLoading ? 'Filing…' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
