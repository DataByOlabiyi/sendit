import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { KycTable } from '@/components/kyc/kyc-table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'KYC Review' }

export default async function KycPage() {
  const supabase = createAdminClient()

  const { data: riders } = await supabase
    .from('riders')
    .select('id, bvn, nin, kyc_status, status, vehicle_type, created_at, admin_question, resubmission_note, users!riders_user_id_fkey(full_name, email, phone)')
    .in('status', ['pending', 'needs_info', 'approved', 'rejected', 'banned'])
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRiders = (riders ?? []) as any[]
  const needsReview   = allRiders.filter((r) => r.status === 'pending')
  const awaitingRider = allRiders.filter((r) => r.status === 'needs_info')
  const reviewed      = allRiders.filter((r) => r.status === 'approved' || r.status === 'rejected' || r.status === 'banned')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
        <p className="text-sm text-gray-500 mt-1">Verify rider identity documents (BVN / NIN)</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Needs Review</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{needsReview.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Awaiting Rider</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{awaitingRider.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {allRiders.filter((r) => r.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rejected / Banned</p>
          <p className="text-3xl font-bold text-red-500 mt-1">
            {allRiders.filter((r) => r.status === 'rejected' || r.status === 'banned').length}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Needs Review ({needsReview.length})</h2>
        <KycTable riders={needsReview} />
      </div>

      {awaitingRider.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Awaiting Rider Response ({awaitingRider.length})</h2>
          <KycTable riders={awaitingRider} />
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Reviewed ({reviewed.length})</h2>
          <KycTable riders={reviewed} readOnly />
        </div>
      )}
    </div>
  )
}
