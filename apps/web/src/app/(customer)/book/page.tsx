import type { Metadata } from 'next'
import { BookingFlow } from '@/components/booking/booking-flow'

export const metadata: Metadata = { title: 'Book a Delivery' }

export default function BookPage() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book a Delivery</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details to send your package</p>
      </div>
      <BookingFlow />
    </div>
  )
}
