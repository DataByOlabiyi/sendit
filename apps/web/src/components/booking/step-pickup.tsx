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

interface StepPickupProps {
  data: BookingData
  onUpdate: (data: Partial<BookingData>) => void
  onNext: () => void
}

export function StepPickup({ data, onUpdate, onNext }: StepPickupProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(
    data.pickup_lat ? { address: data.pickup_address ?? '', lat: data.pickup_lat, lng: data.pickup_lng ?? 0 } : null
  )

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
    onUpdate(formData)
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

      <button
        type="submit"
        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition"
      >
        Continue to Delivery Location
      </button>
    </form>
  )
}
