'use client'

import { useRef, useEffect } from 'react'
import { usePlacesAutocomplete } from '@/hooks/use-places-autocomplete'
import type { PlaceDetails } from '@/hooks/use-places-autocomplete'

interface AddressAutocompleteProps {
  value: string
  placeholder?: string
  onSelect: (details: PlaceDetails) => void
  className?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  placeholder = 'Search for an address',
  onSelect,
  className,
  disabled,
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    value: inputValue,
    setValue,
    predictions,
    isOpen,
    handleChange,
    getPlaceDetails,
    clearPredictions,
    isLoaded,
  } = usePlacesAutocomplete(value)

  useEffect(() => {
    setValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearPredictions()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSelect(placeId: string) {
    try {
      const details = await getPlaceDetails(placeId)
      setValue(details.address)
      clearPredictions()
      onSelect(details)
    } catch {
      console.error('Failed to get place details')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          handleChange(e.target.value)
          if (!isLoaded) {
            // Maps API unavailable — coordinates will be approximate (Lagos centre).
            // The booking step validates that lat/lng are present; the rider-match
            // Edge Function uses the stored coordinates for dispatch, so inaccurate
            // coords here will cause wrong pricing and mis-dispatch.
            onSelect({ address: e.target.value, lat: 6.5244, lng: 3.3792 })
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400 ${className ?? ''}`}
      />
      {!isLoaded && inputValue.length > 2 && (
        <p className="mt-1 text-xs text-amber-600">
          ⚠️ Address search unavailable — coordinates may be inaccurate. Pricing could differ at checkout.
        </p>
      )}

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction.place_id)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-orange-50 transition text-left"
            >
              <svg className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
