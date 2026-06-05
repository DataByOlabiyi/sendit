'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@sendit/utils'

interface PaymentRow {
  id: string
  amount: number
  status: string
  method: string
  paystack_reference: string | null
  paid_at: string | null
  created_at: string
  users: { full_name: string; email: string } | null
  orders: { pickup_address: string; delivery_address: string } | null
}

interface PaymentsTableProps {
  payments: PaymentRow[]
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [search, setSearch] = useState('')

  const filtered = payments.filter(
    (p) =>
      p.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.users?.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.paystack_reference ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or reference..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Platform Cut</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Reference</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-gray-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{payment.users?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{payment.users?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-orange-500">
                      {formatCurrency(payment.amount * 0.15)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 capitalize">{payment.method}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-mono text-gray-500">{payment.paystack_reference ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
