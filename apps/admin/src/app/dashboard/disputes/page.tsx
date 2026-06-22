import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DisputesTable } from '@/components/disputes/disputes-table'

export const metadata: Metadata = { title: 'Disputes' }

export default async function DisputesPage() {
  const supabase = await createClient()

  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      id, type, description, status, resolution, refund_amount, created_at, resolved_at,
      orders!inner(reference, pickup_address, delivery_address, total_fee),
      users!customer_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const counts = {
    open: disputes?.filter((d) => d.status === 'open').length ?? 0,
    under_review: disputes?.filter((d) => d.status === 'under_review').length ?? 0,
    resolved: disputes?.filter((d) => d.status === 'resolved').length ?? 0,
    rejected: disputes?.filter((d) => d.status === 'rejected').length ?? 0,
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="text-sm text-gray-500 mt-1">Review and resolve customer disputes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Open</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{counts.open}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Under Review</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{counts.under_review}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Resolved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{counts.resolved}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{counts.rejected}</p>
        </div>
      </div>

      <DisputesTable disputes={disputes ?? []} />
    </div>
  )
}
