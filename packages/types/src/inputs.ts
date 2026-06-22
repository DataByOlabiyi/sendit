import type { PackageSize, PaymentMethod, OrderStatus, UserRole } from './enums'

export interface OrderStopInput {
  sequence: number
  address: string
  lat: number
  lng: number
  landmark?: string
  contact_name?: string
  contact_phone?: string
}

export interface CreateOrderInput {
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  delivery_landmark?: string
  package_description: string
  package_size: PackageSize
  package_weight?: number
  is_fragile: boolean
  has_insurance: boolean
  special_instructions?: string
  payment_method: PaymentMethod
  promo_id?: string
  promo_discount?: number
  is_scheduled?: boolean
  scheduled_pickup_at?: string
  preferred_time_slot?: 'morning' | 'afternoon' | 'evening' | 'asap'
  extra_stops?: OrderStopInput[]
  is_multi_stop?: boolean
}

export interface UpdateOrderStatusInput {
  order_id: string
  status: OrderStatus
  proof_of_delivery_url?: string
  cancelled_reason?: string
}

export interface PricingEstimate {
  base_fee: number
  distance_fee: number
  insurance_fee: number
  total_fee: number
  estimated_distance_km: number
  estimated_duration_min: number
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  avatar_url: string | null
}
