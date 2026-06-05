'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AddressAutocomplete } from '@/components/maps/address-autocomplete'
import { DeliveryMap } from '@/components/maps/delivery-map'
import { formatDistance, formatDuration, haversineDistance } from '@sendit/utils'
import type { BookingData } from './booking-flow'
import type { PlaceDetails } from '@/hooks/use-places-autocomplete'

const schema = z.object({
  delivery_address: z.string().min(5, 'Enter a delivery address'),
  delivery_lat: z.number(),
  delivery_lng: z.number(),
})

type StepDeliveryData = z.infer<typeof schema>

interface StepDeliveryProps {
  data: BookingData
  onUpdate: (data: Partial<BookingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepDelivery({ data, onUpdate, onNext, onBack }: StepDeliveryProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(
    data.delivery_lat ? { address: data.delivery_address ?? '', lat: data.delivery_lat, lng: data.delivery_lng ?? 0 } : null
  )

  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<StepDeliveryData>({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_address: data.delivery_address ?? '',
      delivery_lat: data.delivery_lat ?? 0,
      delivery_lng: data.delivery_lng ?? 0,
    },
  })

  const deliveryAddress = watch('delivery_address')

  function handlePlaceSelect(details: PlaceDetails) {
    setValue('delivery_address', details.address)
    setValue('delivery_lat', details.lat)
    setValue('delivery_lng', details.lng)
    setSelectedPlace(details)
  }

  const distanceKm = selectedPlace && data.pickup_lat && data.pickup_lng
    ? haversineDistance(data.pickup_lat, data.pickup_lng, selectedPlace.lat, selectedPlace.lng)
    : null

  function onSubmit(formData: StepDeliveryData) {
    onUpdate(formData)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Where should we deliver?</h2>

        {data.pickup_address && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            <p className="text-xs text-gray-600 truncate">{data.pickup_address}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address</label>
          <AddressAutocomplete
            value={deliveryAddress}
            placeholder="Search for delivery address"
            onSelect={handlePlaceSelect}
          />
          {errors.delivery_address && (
            <p className="mt-1.5 text-xs text-red-500">{errors.delivery_address.message}</p>
          )}
        </div>

        <DeliveryMap
          pickupLat={data.pickup_lat}
          pickupLng={data.pickup_lng}
          deliveryLat={selectedPlace?.lat}
          deliveryLng={selectedPlace?.lng}
          showRoute={!!(data.pickup_lat && selectedPlace)}
          height="h-52"
        />

        {distanceKm !== null && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{formatDistance(distanceKm)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{formatDuration(Math.ceil(distanceKm * 4))}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition">
          Back
        </button>
        <button type="submit" className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition">
          Continue
        </button>
      </div>
    </form>
  )
}
