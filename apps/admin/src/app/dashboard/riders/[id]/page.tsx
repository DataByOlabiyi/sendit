import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { RiderActions } from '@/components/riders/rider-actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rider Detail' }

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700',
  approved:   'bg-green-50 text-green-700',
  suspended:  'bg-orange-50 text-orange-700',
  rejected:   'bg-red-50 text-red-700',
  needs_info: 'bg-blue-50 text-blue-700',
  banned:     'bg-gray-900 text-white',
}

const TIER_STYLES: Record<string, string> = {
  bronze:   'bg-amber-50 text-amber-700',
  silver:   'bg-slate-50 text-slate-600',
  gold:     'bg-yellow-50 text-yellow-600',
  platinum: 'bg-violet-50 text-violet-700',
}

const VEHICLE_LABELS: Record<string, string> = {
  bicycle: 'Bicycle', motorcycle: 'Motorcycle', car: 'Car', van: 'Van',
}

function maskId(val: string | null) {
  if (!val) return null
  return val.slice(0, 3) + '••••' + val.slice(-4)
}

async function getSignedUrl(
  supabase: ReturnType<typeof createAdminClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null
  const { data } = await supabase.storage.from('rider-documents').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

function DocCard({ label, url, path }: { label: string; url: string | null; path: string | null }) {
  const isPdf = path?.toLowerCase().endsWith('.pdf') ?? false

  if (!url || !path) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">{label}</p>
        <div className="h-36 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-xs text-gray-400">Not uploaded</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {isPdf ? (
        <div className="h-36 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-xs text-gray-500">PDF Document</p>
        </div>
      ) : (
        <div className="h-36 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1.5 text-xs font-medium text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          View
        </a>
        <a
          href={url}
          download
          className="flex-1 py-1.5 text-xs font-medium text-center text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
        >
          Download
        </a>
      </div>
    </div>
  )
}

export default async function RiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: rider } = await supabase
    .from('riders')
    .select('*, users!riders_user_id_fkey(full_name, email, phone, is_active, created_at)')
    .eq('id', id)
    .single()

  if (!rider) notFound()

  const [licenseUrl, vehicleUrl] = await Promise.all([
    getSignedUrl(supabase, rider.license_doc_url ?? null),
    getSignedUrl(supabase, rider.vehicle_doc_url ?? null),
  ])

  const riderUser = rider.users as {
    full_name: string
    email: string
    phone: string | null
    is_active: boolean
    created_at: string
  } | null

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/riders"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Riders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{riderUser?.full_name ?? 'Unknown Rider'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{riderUser?.email}</p>
          {riderUser?.phone && <p className="text-sm text-gray-500">{riderUser.phone}</p>}
          {riderUser?.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              Joined {new Date(riderUser.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[rider.status] ?? STATUS_STYLES.pending}`}>
            {rider.status.replace('_', ' ')}
          </span>
          {rider.tier && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${TIER_STYLES[rider.tier] ?? 'bg-gray-50 text-gray-500'}`}>
              {rider.tier}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">

        {/* Performance stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Rating', value: `⭐ ${rider.rating?.toFixed(1) ?? '—'}` },
            { label: 'Deliveries', value: rider.total_deliveries ?? 0 },
            { label: 'Status', value: rider.is_online ? '🟢 Online' : '⚫ Offline' },
            { label: 'KYC', value: rider.kyc_status ? rider.kyc_status.charAt(0).toUpperCase() + rider.kyc_status.slice(1) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Identity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identity (KYC)</h2>
            <Link
              href={`/dashboard/kyc/${rider.id}`}
              className="text-xs font-medium text-orange-500 hover:text-orange-600 transition"
            >
              Full KYC Review →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">BVN</p>
              <p className="text-sm font-mono font-medium text-gray-900">
                {maskId(rider.bvn) ?? <span className="text-gray-300 font-sans font-normal">Not provided</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">NIN</p>
              <p className="text-sm font-mono font-medium text-gray-900">
                {maskId(rider.nin) ?? <span className="text-gray-300 font-sans font-normal">Not provided</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">KYC Status</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{rider.kyc_status ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Vehicle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <p className="text-sm font-medium text-gray-900">
                {VEHICLE_LABELS[rider.vehicle_type] ?? rider.vehicle_type ?? '—'}
              </p>
            </div>
            {rider.vehicle_model && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Model</p>
                <p className="text-sm font-medium text-gray-900">{rider.vehicle_model}</p>
              </div>
            )}
            {rider.vehicle_plate && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Plate</p>
                <p className="text-sm font-mono font-medium text-gray-900 tracking-wide">{rider.vehicle_plate}</p>
              </div>
            )}
            {rider.license_number && (
              <div>
                <p className="text-xs text-gray-400 mb-1">License No.</p>
                <p className="text-sm font-mono font-medium text-gray-900">{rider.license_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <DocCard label="Driver's License" url={licenseUrl} path={rider.license_doc_url ?? null} />
            <DocCard label="Vehicle Registration" url={vehicleUrl} path={rider.vehicle_doc_url ?? null} />
          </div>
        </div>

        {/* Notes from KYC flow */}
        {(rider.admin_question || rider.resubmission_note || rider.rejection_reason) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</h2>
            {rider.admin_question && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1.5">Pending admin question</p>
                <p className="text-sm text-blue-800">{rider.admin_question}</p>
              </div>
            )}
            {rider.resubmission_note && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-700 mb-1.5">Rider&apos;s response</p>
                <p className="text-sm text-orange-800">{rider.resubmission_note}</p>
              </div>
            )}
            {rider.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-700 mb-1.5">Rejection / suspension reason</p>
                <p className="text-sm text-red-800">{rider.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Account actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Account Actions</h2>
          <RiderActions riderId={rider.id} currentStatus={rider.status} />
        </div>

      </div>
    </div>
  )
}
