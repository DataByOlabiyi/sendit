// --- Enums -------------------------------------------------------------------

export type UserRole = 'customer' | 'rider' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type PaymentMethod = 'paystack' | 'wallet' | 'cash'

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van'

export type PackageSize = 'small' | 'medium' | 'large' | 'extra_large'

export type RiderStatus = 'pending' | 'approved' | 'suspended' | 'rejected'

export type NotificationType =
  | 'order_update'
  | 'chat_message'
  | 'payment'
  | 'promotion'
  | 'system'

// --- Database Models ---------------------------------------------------------

export interface User {
  id: string
  email: string
  phone: string | null
  full_name: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Rider {
  id: string
  user_id: string
  vehicle_type: VehicleType
  vehicle_plate: string
  vehicle_model: string
  license_number: string
  status: RiderStatus
  is_online: boolean
  current_lat: number | null
  current_lng: number | null
  rating: number
  total_deliveries: number
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  full_address: string
  lat: number
  lng: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  customer_id: string
  rider_id: string | null
  pickup_address_id: string | null
  delivery_address_id: string | null
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  package_description: string
  package_size: PackageSize
  package_weight: number | null
  is_fragile: boolean
  has_insurance: boolean
  special_instructions: string | null
  status: OrderStatus
  estimated_distance_km: number | null
  estimated_duration_min: number | null
  base_fee: number
  distance_fee: number
  insurance_fee: number
  total_fee: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  proof_of_delivery_url: string | null
  cancelled_reason: string | null
  accepted_at: string | null
  picked_up_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderTracking {
  id: string
  order_id: string
  rider_id: string
  lat: number
  lng: number
  recorded_at: string
}

export interface Payment {
  id: string
  order_id: string
  customer_id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paystack_reference: string | null
  paystack_access_code: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentMethodRecord {
  id: string
  user_id: string
  type: 'card' | 'bank'
  label: string
  last_four: string | null
  bank_name: string | null
  paystack_authorization_code: string
  is_default: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  order_id: string
  sender_id: string
  receiver_id: string
  message: string
  attachment_url: string | null
  is_read: boolean
  delivered_at: string | null
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

// --- API / Form Types --------------------------------------------------------

export interface CreateOrderInput {
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  package_description: string
  package_size: PackageSize
  package_weight?: number
  is_fragile: boolean
  has_insurance: boolean
  special_instructions?: string
  payment_method: PaymentMethod
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
