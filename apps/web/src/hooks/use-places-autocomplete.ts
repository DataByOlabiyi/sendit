'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGoogleMaps } from './use-google-maps'

export interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface PlaceDetails {
  address: string
  lat: number
  lng: number
}

export function usePlacesAutocomplete(defaultValue = '') {
  const { isLoaded } = useGoogleMaps()
  const [value, setValue] = useState(defaultValue)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    autocompleteService.current = new google.maps.places.AutocompleteService()
    const div = document.createElement('div')
    placesService.current = new google.maps.places.PlacesService(div)
  }, [isLoaded])

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteService.current || input.length < 3) {
        setPredictions([])
        setIsOpen(false)
        return
      }

      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'ng' },
          types: ['geocode', 'establishment'],
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as PlacePrediction[])
            setIsOpen(true)
          } else {
            setPredictions([])
            setIsOpen(false)
          }
        }
      )
    },
    [isLoaded]
  )

  function handleChange(input: string) {
    setValue(input)
    fetchPredictions(input)
  }

  function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    return new Promise((resolve, reject) => {
      if (!placesService.current) {
        reject(new Error('Places service not initialized'))
        return
      }

      placesService.current.getDetails(
        { placeId, fields: ['formatted_address', 'geometry'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            resolve({
              address: place.formatted_address ?? '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            })
          } else {
            reject(new Error('Failed to get place details'))
          }
        }
      )
    })
  }

  function clearPredictions() {
    setPredictions([])
    setIsOpen(false)
  }

  return {
    value,
    setValue,
    predictions,
    isOpen,
    handleChange,
    getPlaceDetails,
    clearPredictions,
    isLoaded,
  }
}
