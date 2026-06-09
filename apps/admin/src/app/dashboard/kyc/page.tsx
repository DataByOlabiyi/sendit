import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { KycTable } from '@/components/kyc/kyc-table'

export const metadata: Metadata = { title: 'KYC Review' }

export default async function KycPage() {
  const supabase = await createClient()

  const { data: riders } = await supabase
    .from('riders')
    .select('id, bvn, nin, kyc_status, vehicle_type, created_at, users!riders_user_id_fkey(full_name, email, phone)')
    .not('bvn', 'is', null)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRiders = (riders ?? []) as any[]
  const pending = allRiders.filter((r) => r.kyc_status === 'pending' || r.kyc_status === null)
  const reviewed = allRiders.filter((r) => r.kyc_status === 'approved' || r.kyc_status === 'rejected')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
        <p className="text-sm text-gray-500 mt-1">Verify rider identity documents (BVN / NIN)</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending Review</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{pending.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {(riders ?? []).filter((r) => r.kyc_status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rejected</p>
          <p className="text-3xl font-bold text-red-500 mt-1">
            {(riders ?? []).filter((r) => r.kyc_status === 'rejected').length}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Pending Review ({pending.length})</h2>
        <KycTable riders={pending} />
      </div>

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Reviewed ({reviewed.length})</h2>
          <KycTable riders={reviewed} readOnly />
        </div>
      )}
    </div>
  )
}
