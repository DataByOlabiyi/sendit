import type {
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  VehicleType,
  PackageSize,
  RiderStatus,
  NotificationType,
  DisputeStatus,
  DisputeType,
  KycStatus,
  PayoutStatus,
  CancelledBy,
  SavedPaymentMethodType,
} from './enums'

export interface User {
  id: string
  email: string
  phone: string | null
  full_name: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  referral_code: string | null
  referred_by: string | null
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
  license_doc_url: string | null
  vehicle_doc_url: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_code: string | null
  bank_name: string | null
  paystack_recipient_code: string | null
  bvn: string | null
  nin: string | null
  kyc_status: KycStatus
  created_at: string
  updated_at: string
}

export interface RiderWallet {
  id: string
  rider_id: string
  balance: number
  total_earned: number
  total_paid: number
  updated_at: string
}

export interface RiderPayout {
  id: string
  rider_id: string
  amount: number
  status: PayoutStatus
  paystack_transfer_code: string | null
  paystack_reference: string | null
  initiated_by: string | null
  failure_reason: string | null
  initiated_at: string
  completed_at: string | null
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
  reference: string
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
  delivery_landmark: string | null
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
  cancelled_by: CancelledBy | null
  failure_reason: string | null
  assigned_at: string | null
  accepted_at: string | null
  picked_up_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  failed_at: string | null
  returned_at: string | null
  cancelled_at: string | null
  is_scheduled: boolean
  scheduled_pickup_at: string | null
  preferred_time_slot: 'morning' | 'afternoon' | 'evening' | 'asap' | null
  delivery_otp_hash: string | null
  delivery_otp_attempts: number
  delivery_otp_verified_at: string | null
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
  platform_fee: number
  rider_payout: number
  refund_initiated_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentMethodRecord {
  id: string
  user_id: string
  type: SavedPaymentMethodType
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

export interface SupportTicket {
  id: string
  user_id: string
  order_id: string | null
  category: 'order_issue' | 'payment' | 'account' | 'technical' | 'other'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_staff: boolean
  created_at: string
}

export interface AdminAuditLog {
  id: string
  actor_id: string
  action: string
  target_type: string | null
  target_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface Promotion {
  id: string
  code: string
  description: string | null
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount: number | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Dispute {
  id: string
  order_id: string
  customer_id: string
  rider_id: string | null
  type: DisputeType
  description: string
  evidence_urls: string[]
  status: DisputeStatus
  resolution: string | null
  resolved_by: string | null
  refund_amount: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}
