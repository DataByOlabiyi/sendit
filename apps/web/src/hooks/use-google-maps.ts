'use client'

import { useState, useEffect } from 'react'
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps'

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded())

  useEffect(() => {
    if (isGoogleMapsLoaded()) {
      setIsLoaded(true)
      return
    }

    loadGoogleMaps().then(() => {
      setIsLoaded(true)
    }).catch(() => {
      // Maps unavailable — components fall back to plain text inputs
    })
  }, [])

  return { isLoaded }
}
