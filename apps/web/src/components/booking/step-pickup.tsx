'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AddressAutocomplete } from '@/components/maps/address-autocomplete'
import { DeliveryMap } from '@/components/maps/delivery-map'
import type { BookingData } from './booking-flow'
import type { PlaceDetails } from '@/hooks/use-places-autocomplete'

const schema = z.object({
  pickup_address: z.string().min(5, 'Enter a pickup address'),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
})

type StepPickupData = z.infer<typeof schema>

type TimeSlot = 'morning' | 'afternoon' | 'evening'

const TIME_SLOTS: { value: TimeSlot; label: string; hours: string }[] = [
  { value: 'morning',   label: 'Morning',   hours: '8am – 12pm' },
  { value: 'afternoon', label: 'Afternoon', hours: '12pm – 5pm' },
  { value: 'evening',   label: 'Evening',   hours: '5pm – 9pm' },
]

const SLOT_START_HOUR: Record<TimeSlot, number> = { morning: 8, afternoon: 12, evening: 17 }

function todayDateString() {
  return new Date().toISOString().split('T')[0]
}

function maxDateString() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

interface StepPickupProps {
  data: BookingData
  onUpdate: (data: Partial<BookingData>) => void
  onNext: () => void
}

export function StepPickup({ data, onUpdate, onNext }: StepPickupProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(
    data.pickup_lat ? { address: data.pickup_address ?? '', lat: data.pickup_lat, lng: data.pickup_lng ?? 0 } : null
  )
  const [isScheduled, setIsScheduled] = useState(data.is_scheduled ?? false)
  const [scheduleDate, setScheduleDate] = useState(data.scheduled_pickup_at?.split('T')[0] ?? '')
  const [scheduleSlot, setScheduleSlot] = useState<TimeSlot>(
    (data.preferred_time_slot as TimeSlot | undefined) ?? 'morning'
  )
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<StepPickupData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pickup_address: data.pickup_address ?? '',
      pickup_lat: data.pickup_lat ?? 0,
      pickup_lng: data.pickup_lng ?? 0,
    },
  })

  const pickupAddress = watch('pickup_address')

  function handlePlaceSelect(details: PlaceDetails) {
    setValue('pickup_address', details.address)
    setValue('pickup_lat', details.lat)
    setValue('pickup_lng', details.lng)
    setSelectedPlace(details)
  }

  function onSubmit(formData: StepPickupData) {
    if (isScheduled) {
      if (!scheduleDate) { setScheduleError('Please select a pickup date'); return }
      setScheduleError(null)
      const hour = SLOT_START_HOUR[scheduleSlot]
      const scheduledPickupAt = new Date(`${scheduleDate}T${String(hour).padStart(2, '0')}:00:00`).toISOString()
      onUpdate({ ...formData, is_scheduled: true, scheduled_pickup_at: scheduledPickupAt, preferred_time_slot: scheduleSlot })
    } else {
      onUpdate({ ...formData, is_scheduled: false, scheduled_pickup_at: undefined, preferred_time_slot: 'asap' })
    }
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Where should we pick up?</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Address</label>
          <AddressAutocomplete
            value={pickupAddress}
            placeholder="Search for pickup address"
            onSelect={handlePlaceSelect}
          />
          {errors.pickup_address && (
            <p className="mt-1.5 text-xs text-red-500">{errors.pickup_address.message}</p>
          )}
          {errors.pickup_lat && (
            <p className="mt-1.5 text-xs text-red-500">Please select an address from the suggestions</p>
          )}
        </div>

        <DeliveryMap
          pickupLat={selectedPlace?.lat}
          pickupLng={selectedPlace?.lng}
          height="h-52"
        />
      </div>

      {/* Scheduling */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">When do you need pickup?</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsScheduled(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition ${
              !isScheduled ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            ASAP
          </button>
          <button
            type="button"
            onClick={() => setIsScheduled(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition ${
              isScheduled ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Schedule for later
          </button>
        </div>

        {isScheduled && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Date</label>
              <input
                type="date"
                value={scheduleDate}
                min={todayDateString()}
                max={maxDateString()}
                onChange={(e) => { setScheduleDate(e.target.value); setScheduleError(null) }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {scheduleError && <p className="mt-1.5 text-xs text-red-500">{scheduleError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setScheduleSlot(slot.value)}
                    className={`py-2.5 rounded-xl border-2 transition text-center ${
                      scheduleSlot === slot.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${scheduleSlot === slot.value ? 'text-orange-600' : 'text-gray-700'}`}>{slot.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{slot.hours}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-24 lg:static -mx-4 px-4 lg:mx-0 lg:px-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 lg:pt-0 lg:pb-0 lg:bg-none z-10">
        <button
          type="submit"
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition shadow-lg shadow-orange-100 lg:shadow-none"
        >
          Continue to Delivery Location
        </button>
      </div>
    </form>
  )
}
