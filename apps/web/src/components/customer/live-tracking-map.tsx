'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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

interface Location {
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
  const [riderLocation, setRiderLocation] = useState<Location | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchInitialLocation() {
      if (!riderId) return

      const { data } = await supabase
        .from('riders')
        .select('current_lat, current_lng, updated_at')
        .eq('id', riderId)
        .single()

      if (data?.current_lat && data?.current_lng) {
        setRiderLocation({
          lat: data.current_lat,
          lng: data.current_lng,
          updatedAt: data.updated_at,
        })
      }
    }

    fetchInitialLocation()

    if (!riderId) return

    // Subscribe to rider table updates for location changes
    const channel = supabase
      .channel(`rider_loc:${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${riderId}`,
        },
        (payload) => {
          const r = payload.new as { current_lat: number | null; current_lng: number | null; updated_at: string }
          if (r.current_lat && r.current_lng) {
            setRiderLocation({
              lat: r.current_lat,
              lng: r.current_lng,
              updatedAt: r.updated_at,
            })
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [riderId, orderId])

  const isDelivered = orderStatus === 'delivered'
  const hasRider = !!riderId
  const hasLocation = !!riderLocation

  // Map center: use rider location if available, else delivery destination
  const centerLat = riderLocation?.lat ?? deliveryLat
  const centerLng = riderLocation?.lng ?? deliveryLng
  const mapSrc = `https://maps.google.com/maps?q=${centerLat},${centerLng}&z=15&output=embed`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Map */}
      <div className="relative">
        <iframe
          key={`${centerLat},${centerLng}`}
          src={mapSrc}
          className="w-full h-64"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Rider location map"
        />

        {/* Live badge */}
        {!isDelivered && hasRider && (
          <div className="absolute top-3 left-3">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              isConnected ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        )}
      </div>

      {/* Status info */}
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
            <p className="text-xs text-gray-500 mt-0.5">Location will appear once the rider goes online</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Rider en route</p>
              {riderLocation.updatedAt && (
                <p className="text-xs text-gray-400">
                  Updated {formatRelativeTime(riderLocation.updatedAt)}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">→ {deliveryAddress}</p>

            {/* Open in maps */}
            <a
              href={`https://maps.google.com/?q=${riderLocation.lat},${riderLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open rider location in Maps
            </a>
          </div>
        )}
      </div>

      {/* Route summary */}
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
