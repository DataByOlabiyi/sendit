import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderOnboardingForm } from '@/components/rider/onboarding-form'

export const metadata: Metadata = { title: 'Rider Onboarding' }

export default async function RiderOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = user
    ? await supabase.from('riders').select('status, rejection_reason').eq('user_id', user.id).maybeSingle()
    : { data: null }

  const isPending = rider?.status === 'pending'
  const isRejected = rider?.status === 'rejected'

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white px-4 py-12 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-orange-100">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Application under review</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            We&apos;ve received your application and documents. Our team will review them within 24–48 hours. You&apos;ll receive a notification once a decision has been made.
          </p>
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-left space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Application submitted</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-white block" />
              </div>
              <span className="text-sm text-gray-700">Documents under review</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-400">Account activation</span>
            </div>
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
