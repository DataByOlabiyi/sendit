'use client'

import { useEffect, useRef, useState } from 'react'
import { useGoogleMaps } from '@/hooks/use-google-maps'

interface DeliveryMapProps {
  pickupLat?: number
  pickupLng?: number
  deliveryLat?: number
  deliveryLng?: number
  riderLat?: number
  riderLng?: number
  height?: string
  showRoute?: boolean
}

export function DeliveryMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  riderLat,
  riderLng,
  height = 'h-64',
  showRoute = false,
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const { isLoaded, hasError: mapsAuthError } = useGoogleMaps()
  const [mapError, setMapError] = useState(false)

  // Default center: Lagos, Nigeria
  const defaultCenter = { lat: 6.5244, lng: 3.3792 }

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    try {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      })

      directionsRenderer.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#f97316',
          strokeWeight: 4,
        },
      })
      directionsRenderer.current.setMap(mapInstance.current)
    } catch {
      setMapError(true)
    }
  }, [isLoaded])

  useEffect(() => {
    if (!mapInstance.current || !isLoaded) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const bounds = new google.maps.LatLngBounds()
    let hasMarkers = false

    // Pickup marker
    if (pickupLat != null && pickupLng != null) {
      const marker = new google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#f97316',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Pickup',
      })
      markersRef.current.push(marker)
      bounds.extend({ lat: pickupLat, lng: pickupLng })
      hasMarkers = true
    }

    // Delivery marker
    if (deliveryLat != null && deliveryLng != null) {
      const marker = new google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#111827',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Delivery',
      })
      markersRef.current.push(marker)
      bounds.extend({ lat: deliveryLat, lng: deliveryLng })
      hasMarkers = true
    }

    // Rider marker
    if (riderLat != null && riderLng != null) {
      const marker = new google.maps.Marker({
        position: { lat: riderLat, lng: riderLng },
        map: mapInstance.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#f97316" stroke="white" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" font-size="14">🏍</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
        },
        title: 'Rider',
      })
      markersRef.current.push(marker)
      bounds.extend({ lat: riderLat, lng: riderLng })
      hasMarkers = true
    }

    if (hasMarkers) {
      mapInstance.current.fitBounds(bounds, 60)
    }

    // Draw route
    if (showRoute && pickupLat && pickupLng && deliveryLat && deliveryLng && directionsRenderer.current) {
      const directionsService = new google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: pickupLat, lng: pickupLng },
          destination: { lat: deliveryLat, lng: deliveryLng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result && directionsRenderer.current) {
            directionsRenderer.current.setDirections(result)
          }
        }
      )
    }
  }, [isLoaded, pickupLat, pickupLng, deliveryLat, deliveryLng, riderLat, riderLng, showRoute])

  const showFallback = mapsAuthError || mapError
  const isLoadingMap = !isLoaded && !showFallback

  if (showFallback || isLoadingMap) {
    return (
      <div className={`${height} rounded-xl bg-gray-100 flex items-center justify-center`}>
        <div className="text-center px-4">
          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <p className="text-xs text-gray-400">
            {isLoadingMap ? 'Loading map…' : 'Map unavailable'}
          </p>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} className={`${height} rounded-xl overflow-hidden w-full`} />
}
