'use client'

import { useState, useEffect } from 'react'
import { loadGoogleMaps, isGoogleMapsLoaded, hasGoogleMapsAuthError } from '@/lib/google-maps'

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded())
  const [hasError, setHasError] = useState(hasGoogleMapsAuthError())

  useEffect(() => {
    if (isGoogleMapsLoaded()) {
      setIsLoaded(true)
      return
    }

    loadGoogleMaps()
      .then(() => setIsLoaded(true))
      .catch(() => setHasError(true))
  }, [])

  return { isLoaded, hasError }
}
