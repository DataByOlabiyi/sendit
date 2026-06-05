// --- Pricing -----------------------------------------------------------------

import { PRICING, PACKAGE_SIZE_MULTIPLIER } from '@sendit/constants'
import type { PackageSize, PricingEstimate } from '@sendit/types'

export function calculatePricing(
  distanceKm: number,
  packageSize: PackageSize,
  hasInsurance: boolean,
  durationMin: number
): PricingEstimate {
  const multiplier = PACKAGE_SIZE_MULTIPLIER[packageSize]
  const base_fee = PRICING.BASE_FEE
  const distance_fee = Math.ceil(distanceKm * PRICING.PER_KM_FEE * multiplier)
  const insurance_fee = hasInsurance ? PRICING.INSURANCE_FEE : 0
  const total_fee = base_fee + distance_fee + insurance_fee

  return {
    base_fee,
    distance_fee,
    insurance_fee,
    total_fee,
    estimated_distance_km: Math.round(distanceKm * 10) / 10,
    estimated_duration_min: durationMin,
  }
}

// --- Formatting --------------------------------------------------------------

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Geo ---------------------------------------------------------------------

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// --- Misc --------------------------------------------------------------------

export function generateOrderReference(): string {
  const prefix = 'SDT'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.substring(0, maxLength)}...`
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
