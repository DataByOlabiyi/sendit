'use client'

import { useState, useEffect } from 'react'
import { StepPickup } from './step-pickup'
import { StepDelivery } from './step-delivery'
import { StepPackage } from './step-package'
import { StepConfirm } from './step-confirm'
import type { CreateOrderInput } from '@sendit/types'

export type BookingData = Partial<CreateOrderInput>

const STORAGE_KEY = 'sendit_booking_draft'
const DEFAULT_DATA: BookingData = { is_fragile: false, has_insurance: false, payment_method: 'paystack' }

const steps = [
  { number: 1, label: 'Pickup' },
  { number: 2, label: 'Delivery' },
  { number: 3, label: 'Package' },
  { number: 4, label: 'Confirm' },
]

export function BookingFlow() {
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>(DEFAULT_DATA)

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { step: number; data: BookingData }
        setCurrentStep(parsed.step ?? 1)
        setBookingData({ ...DEFAULT_DATA, ...parsed.data })
      }
    } catch {
      // Corrupted draft — start fresh
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Persist draft on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: bookingData }))
    } catch {
      // Storage full or unavailable — non-fatal
    }
  }, [currentStep, bookingData])

  function updateBookingData(data: Partial<BookingData>) {
    setBookingData((prev) => ({ ...prev, ...data }))
  }

  function clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function nextStep() {
    setCurrentStep((prev) => Math.min(prev + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center mb-8 px-1">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                currentStep > step.number
                  ? 'bg-orange-500 text-white'
                  : currentStep === step.number
                  ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {currentStep > step.number ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${currentStep === step.number ? 'text-orange-500' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${currentStep > step.number ? 'bg-orange-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <StepPickup data={bookingData} onUpdate={updateBookingData} onNext={nextStep} />
      )}
      {currentStep === 2 && (
        <StepDelivery data={bookingData} onUpdate={updateBookingData} onNext={nextStep} onBack={prevStep} />
      )}
      {currentStep === 3 && (
        <StepPackage data={bookingData} onUpdate={updateBookingData} onNext={nextStep} onBack={prevStep} />
      )}
      {currentStep === 4 && (
        <StepConfirm data={bookingData} onBack={prevStep} onSuccess={clearDraft} />
      )}
    </div>
  )
}
