import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RiderOnboardingForm } from '@/components/rider/onboarding-form'

export const metadata: Metadata = { title: 'Rider Onboarding' }

const VEHICLE_LABELS: Record<string, string> = {
  bicycle:    'Bicycle',
  motorcycle: 'Motorcycle',
  car:        'Car',
  van:        'Van',
}

const VEHICLE_ICONS: Record<string, string> = {
  bicycle:    '🚲',
  motorcycle: '🏍️',
  car:        '🚗',
  van:        '🚐',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function RiderOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use admin client for riders SELECT — the regular server client's JWT is not
  // always forwarded to PostgREST, causing auth.uid() to return NULL in RLS.
  // We enforce the same per-user scope via eq('user_id', user.id).
  const admin = user ? createAdminClient() : null

  const [{ data: rider }, { data: profile }] = await Promise.all([
    admin
      ? admin.from('riders')
          .select('status, rejection_reason, vehicle_type, vehicle_model, vehicle_plate, license_number, created_at')
          .eq('user_id', user!.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('users').select('full_name').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Rider'
  const isPending = rider?.status === 'pending'
  const isRejected = rider?.status === 'rejected'

  if (isPending) {
    const vehicleLabel = VEHICLE_LABELS[rider?.vehicle_type ?? ''] ?? rider?.vehicle_type ?? '—'
    const vehicleIcon  = VEHICLE_ICONS[rider?.vehicle_type ?? ''] ?? '🚗'
    const submittedOn  = rider?.created_at ? formatDate(rider.created_at) : null

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4 py-10">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Header */}
          <div className="text-center pt-4 pb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-500 shadow-lg shadow-orange-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set, {firstName}!</h1>
            <p className="text-sm text-gray-500 mt-1">Your application is being reviewed by our team</p>
          </div>

          {/* Review timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Application status</h2>
            <div className="space-y-0">
              {/* Step 1 — done */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div className="w-0.5 h-8 bg-orange-200 mt-1" />
                </div>
                <div className="pt-1 pb-8">
                  <p className="text-sm font-semibold text-gray-900">Application submitted</p>
                  {submittedOn && <p className="text-xs text-gray-400 mt-0.5">{submittedOn}</p>}
                </div>
              </div>

              {/* Step 2 — in progress */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0 ring-4 ring-orange-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-white block animate-pulse" />
                  </div>
                  <div className="w-0.5 h-8 bg-gray-100 mt-1" />
                </div>
                <div className="pt-1 pb-8">
                  <p className="text-sm font-semibold text-orange-600">Document verification</p>
                  <p className="text-xs text-gray-400 mt-0.5">Usually 24–48 hours</p>
                </div>
              </div>

              {/* Step 3 — pending */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                  </div>
                </div>
                <div className="pt-1">
                  <p className="text-sm font-medium text-gray-400">Account activated — start earning!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your submission</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Vehicle</span>
                <span className="text-sm font-medium text-gray-900">
                  {vehicleIcon} {vehicleLabel}
                  {rider?.vehicle_model ? ` · ${rider.vehicle_model}` : ''}
                </span>
              </div>
              {rider?.vehicle_plate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Plate number</span>
                  <span className="text-sm font-medium text-gray-900 font-mono tracking-wide">{rider.vehicle_plate}</span>
                </div>
              )}
              {rider?.license_number && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">License no.</span>
                  <span className="text-sm font-medium text-gray-900 font-mono tracking-wide">{rider.license_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* What to expect / tips */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">While you wait</h2>
            <div className="space-y-3">
              {[
                { icon: '📱', text: 'Keep your phone charged and notifications on — you\'ll hear from us soon.' },
                { icon: '📄', text: 'Make sure the documents you uploaded are valid and not expired.' },
                { icon: '🛵', text: 'Once approved, you can start accepting deliveries immediately.' },
              ].map(({ icon, text }) => (
                <div key={icon} className="flex gap-3">
                  <span className="text-base shrink-0">{icon}</span>
                  <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="text-center pb-4">
            <p className="text-xs text-gray-400">
              Questions? Reach us at{' '}
              <a href="mailto:support@sendit.ng" className="text-orange-500 font-medium hover:underline">
                support@sendit.ng
              </a>
            </p>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${isRejected ? 'bg-red-500' : 'bg-orange-500'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          {isRejected ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Application update required</h1>
              <p className="text-sm text-gray-500 mt-1">Your previous application was not approved. Please review the feedback below and resubmit.</p>
              {rider?.rejection_reason && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-left">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Rejection reason</p>
                  <p className="text-sm text-red-600 break-words">{rider.rejection_reason}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Complete your rider profile</h1>
              <p className="text-sm text-gray-500 mt-1">We need a few details before you can start delivering</p>
            </>
          )}
        </div>
        <RiderOnboardingForm isResubmit={isRejected} />
      </div>
    </div>
  )
}
