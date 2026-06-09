'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@sendit/utils'
import { PRICING } from '@sendit/constants'
import type { Rider, RiderWallet } from '@sendit/types'
import { saveRiderBankAccountAction, requestPayoutAction } from '@/app/rider/earnings-actions'

interface Payment {
  id: string
  amount: number
  rider_payout: number | null
  paid_at: string | null
  created_at: string
  orders?: { reference: string | null } | null
}

interface RecentPayout {
  id: string
  amount: number
  status: string
  initiated_at: string
  completed_at: string | null
  failure_reason: string | null
}

interface RiderEarningsProps {
  payments: Payment[]
  rider: Rider
  wallet: Pick<RiderWallet, 'balance' | 'total_earned' | 'total_paid'> | null
  recentPayouts: RecentPayout[]
}

type Period = 'today' | 'week' | 'month' | 'all'

const NIGERIAN_BANKS = [
  { code: '058', name: 'GTBank' },
  { code: '011', name: 'First Bank' },
  { code: '033', name: 'UBA' },
  { code: '232', name: 'Sterling Bank' },
  { code: '214', name: 'FCMB' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '068', name: 'Standard Chartered' },
  { code: '035', name: 'Wema Bank' },
  { code: '023', name: 'Citibank' },
  { code: '063', name: 'Diamond Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '076', name: 'Skye Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '101', name: 'ProvidusBank' },
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '50515', name: 'Moniepoint' },
  { code: '50211', name: 'Kuda Bank' },
]

const payoutStatusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export function RiderEarnings({ payments, rider, wallet, recentPayouts }: RiderEarningsProps) {
  const [period, setPeriod] = useState<Period>('week')
  const [showBankForm, setShowBankForm] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [bankForm, setBankForm] = useState({
    bank_account_number: rider.bank_account_number ?? '',
    bank_code: rider.bank_code ?? '',
    bank_name: rider.bank_name ?? '',
    bank_account_name: rider.bank_account_name ?? '',
  })
  const [savingBank, setSavingBank] = useState(false)
  const [requestingPayout, setRequestingPayout] = useState(false)

  function filterByPeriod(p: Period): Payment[] {
    const now = new Date()
    return payments.filter((payment) => {
      if (!payment.paid_at) return false
      const paidAt = new Date(payment.paid_at)
      switch (p) {
        case 'today': {
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          return paidAt >= today
        }
        case 'week': {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return paidAt >= weekAgo
        }
        case 'month': {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return paidAt >= monthAgo
        }
        default:
          return true
      }
    })
  }

  function payoutFor(p: Payment): number {
    return p.rider_payout ?? p.amount * (1 - PRICING.PLATFORM_COMMISSION)
  }

  const filtered = filterByPeriod(period)
  const totalEarnings = filtered.reduce((sum, p) => sum + payoutFor(p), 0)
  const totalOrders = filtered.length
  const hasBankAccount = !!(rider.bank_account_number && rider.bank_code)
  const walletBalance = wallet?.balance ?? 0

  const periods: { value: Period; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ]

  async function handleSaveBank() {
    setSavingBank(true)
    const result = await saveRiderBankAccountAction(bankForm)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Bank account saved')
      setShowBankForm(false)
    }
    setSavingBank(false)
  }

  async function handleRequestPayout() {
    const amount = parseInt(payoutAmount, 10)
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum payout is ₦500')
      return
    }
    setRequestingPayout(true)
    const result = await requestPayoutAction(amount)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Payout request submitted! Admin will process within 24 hours.')
      setShowPayoutModal(false)
      setPayoutAmount('')
    }
    setRequestingPayout(false)
  }

  return (
    <div>
      {/* Wallet balance card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white mb-6">
        <p className="text-xs text-orange-200 uppercase tracking-wide mb-1">Wallet Balance</p>
        <p className="text-3xl font-bold mb-4">{formatCurrency(walletBalance)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={walletBalance < 500 || !hasBankAccount}
            className="px-4 py-2 bg-white text-orange-600 rounded-xl text-sm font-semibold disabled:opacity-50 transition hover:bg-orange-50"
          >
            Request Payout
          </button>
          <button
            onClick={() => setShowBankForm(true)}
            className="px-4 py-2 bg-orange-400/40 text-white rounded-xl text-sm font-medium transition hover:bg-orange-400/60"
          >
            {hasBankAccount ? 'Update Bank' : 'Add Bank Account'}
          </button>
        </div>
        {!hasBankAccount && (
          <p className="text-xs text-orange-200 mt-3">Add a bank account to request payouts</p>
        )}
        {hasBankAccount && walletBalance < 500 && (
          <p className="text-xs text-orange-200 mt-3">Minimum ₦500 balance required to request a payout</p>
        )}
      </div>

      {/* Bank account form */}
      {showBankForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Bank Account Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank</label>
              <select
                value={bankForm.bank_code}
                onChange={(e) => {
                  const bank = NIGERIAN_BANKS.find((b) => b.code === e.target.value)
                  setBankForm((f) => ({ ...f, bank_code: e.target.value, bank_name: bank?.name ?? '' }))
                }}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Select bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={bankForm.bank_account_number}
                onChange={(e) => setBankForm((f) => ({ ...f, bank_account_number: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit account number"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                value={bankForm.bank_account_name}
                onChange={(e) => setBankForm((f) => ({ ...f, bank_account_name: e.target.value }))}
                placeholder="As it appears on your bank statement"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowBankForm(false)}
              className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBank}
              disabled={savingBank}
              className="flex-1 py-2.5 text-sm text-white bg-orange-500 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-60"
            >
              {savingBank ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </div>
      )}

      {/* Bank account display */}
      {hasBankAccount && !showBankForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M9 14h.01M9 18h.01M3 6a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2H3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{rider.bank_account_name}</p>
            <p className="text-xs text-gray-500">{rider.bank_name} · ****{rider.bank_account_number?.slice(-4)}</p>
          </div>
          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
        </div>
      )}

      {/* Recent payouts */}
      {recentPayouts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Payouts</h2>
          <div className="space-y-2">
            {recentPayouts.map((payout) => (
              <div key={payout.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(payout.initiated_at)}</p>
                  {payout.failure_reason && (
                    <p className="text-xs text-red-500 mt-0.5">{payout.failure_reason}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${payoutStatusStyles[payout.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              period === p.value
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Earnings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Deliveries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">All-time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{rider.total_deliveries}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Rating</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">⭐ {rider.rating.toFixed(1)}</p>
        </div>
      </div>

      {/* Commission note */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
        <p className="text-xs text-orange-700">
          <strong>Earnings split:</strong> You receive{' '}
          {Math.round((1 - PRICING.PLATFORM_COMMISSION) * 100)}% of each delivery fee.
          The remaining {Math.round(PRICING.PLATFORM_COMMISSION * 100)}% is the platform fee.
          Earnings are credited to your wallet after each delivery.
        </p>
      </div>

      {/* Transaction ledger */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Transactions</h2>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">Completed deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => {
            const payout = payoutFor(payment)
            const orderRef = payment.orders?.reference ?? null
            return (
              <div key={payment.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Delivery completed</p>
                    {orderRef && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{orderRef}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-green-600">+{formatCurrency(payout)}</p>
                    <p className="text-xs text-gray-400">of {formatCurrency(payment.amount)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payout request modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full sm:max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Request Payout</h3>
            <p className="text-xs text-gray-500 mb-4">
              Available: <strong>{formatCurrency(walletBalance)}</strong>
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount (₦)</label>
            <input
              type="number"
              inputMode="numeric"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Minimum ₦500"
              min={500}
              max={walletBalance}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPayoutModal(false); setPayoutAmount('') }}
                disabled={requestingPayout}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={requestingPayout}
                className="flex-1 py-2.5 text-sm text-white bg-orange-500 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-60"
              >
                {requestingPayout ? 'Submitting...' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
