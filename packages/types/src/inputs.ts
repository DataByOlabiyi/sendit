import type { PackageSize, PaymentMethod, OrderStatus, UserRole } from './enums'

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
