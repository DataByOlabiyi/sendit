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

  const isRejected = rider?.status === 'rejected'

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
                  <p className="text-sm text-red-600">{rider.rejection_reason}</p>
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
