import type { Metadata } from 'next'
import { RiderOnboardingForm } from '@/components/rider/onboarding-form'

export const metadata: Metadata = { title: 'Rider Onboarding' }

export default function RiderOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete your rider profile</h1>
          <p className="text-sm text-gray-500 mt-1">We need a few details before you can start delivering</p>
        </div>
        <RiderOnboardingForm />
      </div>
    </div>
  )
}
