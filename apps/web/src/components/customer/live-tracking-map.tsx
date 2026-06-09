'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loadGoogleMaps } from '@/lib/google-maps'
import { formatRelativeTime } from '@sendit/utils'

interface LiveTrackingMapProps {
  orderId: string
  riderId: string | null
  pickupLat: number
  pickupLng: number
  pickupAddress: string
  deliveryLat: number
  deliveryLng: number
  deliveryAddress: string
  orderStatus: string
}

interface RiderLocation {
  lat: number
  lng: number
  updatedAt: string | null
}

export function LiveTrackingMap({
  orderId,
  riderId,
  pickupLat,
  pickupLng,
  pickupAddress,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  orderStatus,
}: LiveTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const riderMarkerRef = useRef<google.maps.Marker | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  // ── Initialize the Google Map once ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // Capture prop values before the async chain so TypeScript can trace usage
    const pickup   = { lat: pickupLat,   lng: pickupLng }
    const delivery = { lat: deliveryLat, lng: deliveryLng }

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return

        const map = new google.maps.Map(mapContainerRef.current, {
          center: pickup,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        })
        mapRef.current = map

        // Pickup marker — orange circle
        new google.maps.Marker({
          position: pickup,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#f97316',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: `Pickup: ${pickupAddress}`,
          zIndex: 2,
        })

        // Delivery marker — dark circle
        new google.maps.Marker({
          position: delivery,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#111827',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: `Delivery: ${deliveryAddress}`,
          zIndex: 2,
        })

        // Dashed route line pickup → delivery
        new google.maps.Polyline({
          path: [pickup, delivery],
          geodesic: true,
          strokeColor: '#f97316',
          strokeOpacity: 0,
          icons: [
            {
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: '#f97316', scale: 3 },
              offset: '0',
              repeat: '14px',
            },
          ],
          map,
        })

        // Fit map to show both endpoints
        const bounds = new google.maps.LatLngBounds()
        bounds.extend(pickup)
        bounds.extend(delivery)
        map.fitBounds(bounds, { top: 48, right: 32, bottom: 32, left: 32 })

        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setMapError(true)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once — pickup/delivery coords are stable after mount

  // ── Fetch initial rider position + subscribe to live updates ────────────────
  useEffect(() => {
    if (!riderId) return

    const supabase = createClient()

    supabase
      .from('riders')
      .select('current_lat, current_lng, updated_at')
      .eq('id', riderId)
      .single()
      .then(({ data }) => {
        if (data?.current_lat && data?.current_lng) {
          setRiderLocation({ lat: data.current_lat, lng: data.current_lng, updatedAt: data.updated_at })
        }
      })

    const channel = supabase
      .channel(`rider_loc:${riderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'riders', filter: `id=eq.${riderId}` },
        (payload) => {
          const r = payload.new as { current_lat: number | null; current_lng: number | null; updated_at: string }
          if (r.current_lat && r.current_lng) {
            setRiderLocation({ lat: r.current_lat, lng: r.current_lng, updatedAt: r.updated_at })
          }
        },
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [riderId, orderId])

  // ── Update rider marker whenever location changes ───────────────────────────
  useEffect(() => {
    if (!riderLocation || !mapRef.current || !mapReady) return

    const pos = { lat: riderLocation.lat, lng: riderLocation.lng }

    if (riderMarkerRef.current) {
      riderMarkerRef.current.setPosition(pos)
    } else {
      const svgIcon = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#f97316" stroke="white" stroke-width="2.5"/>
          <text x="20" y="27" font-size="18" text-anchor="middle" fill="white">🏍</text>
        </svg>
      `)
      riderMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${svgIcon}`,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        title: 'Rider',
        zIndex: 10,
        optimized: false,
      })
    }

    // Keep rider in view while active
    if (['accepted', 'picked_up', 'in_transit'].includes(orderStatus)) {
      mapRef.current.panTo(pos)
    }
  }, [riderLocation, mapReady, orderStatus])

  const isDelivered = orderStatus === 'delivered'
  const hasRider = !!riderId
  const hasLocation = !!riderLocation

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div className="relative h-64">
        {mapError ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <p className="text-sm text-gray-400">Map unavailable</p>
          </div>
        ) : (
          <>
            <div ref={mapContainerRef} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {/* Live indicator */}
        {!isDelivered && hasRider && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm ${
              isConnected
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-white animate-pulse' : 'bg-gray-400'
              }`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        )}

        {/* Open in Google Maps */}
        {hasLocation && !isDelivered && (
          <a
            href={`https://maps.google.com/?q=${riderLocation!.lat},${riderLocation!.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 z-10 bg-white text-xs font-medium text-gray-700 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition"
          >
            Open in Maps
          </a>
        )}
      </div>

      {/* ── Status row ──────────────────────────────────────────────────────── */}
      <div className="p-4">
        {isDelivered ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Delivered</p>
              <p className="text-xs text-gray-500 truncate">{deliveryAddress}</p>
            </div>
          </div>
        ) : !hasRider ? (
          <div>
            <p className="text-sm font-medium text-gray-900">Waiting for rider</p>
            <p className="text-xs text-gray-500 mt-0.5">A nearby rider will be assigned shortly</p>
          </div>
        ) : !hasLocation ? (
          <div>
            <p className="text-sm font-medium text-gray-900">Rider assigned</p>
            <p className="text-xs text-gray-500 mt-0.5">Location will appear once the rider is on the way</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Rider en route</p>
            {riderLocation.updatedAt && (
              <p className="text-xs text-gray-400">
                Updated {formatRelativeTime(riderLocation.updatedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Route summary ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-50">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            <div className="w-0.5 h-6 bg-gray-200" />
            <div className="w-2 h-2 rounded-full bg-gray-900 shrink-0" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-xs text-gray-400">PICKUP</p>
              <p className="text-xs text-gray-700 truncate">{pickupAddress}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">DELIVERY</p>
              <p className="text-xs text-gray-700 truncate">{deliveryAddress}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
