import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClaimsTable } from '@/components/claims/claims-table'

export const metadata: Metadata = { title: 'Insurance Claims' }

export default async function ClaimsPage() {
  const supabase = await createClient()

  const { data: claims } = await supabase
    .from('insurance_claims')
    .select(`
      id, claim_amount, payout_amount, status, description, resolution_note,
      created_at, resolved_at,
      orders!inner(id, reference, total_fee),
      users!insurance_claims_customer_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const stats = {
    pending: (claims ?? []).filter((c) => c.status === 'pending').length,
    under_review: (claims ?? []).filter((c) => c.status === 'under_review').length,
    approved: (claims ?? []).filter((c) => c.status === 'approved').length,
    total_paid: (claims ?? [])
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + (c.payout_amount ?? 0), 0),
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
        <p className="text-sm text-gray-500 mt-1">Review and resolve customer insurance claims</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Under Review</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.under_review}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Paid Out</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ₦{((stats.total_paid) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ClaimsTable claims={(claims ?? []) as any[]} />
    </div>
  )
}
