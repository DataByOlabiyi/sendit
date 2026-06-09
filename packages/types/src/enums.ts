export type UserRole = 'customer' | 'rider' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'failed_delivery'
  | 'return_in_progress'
  | 'returned'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

// 'wallet' removed until the wallet top-up and deduction flows are implemented
// 'cash' kept for historical DB records; disabled in booking UI until cash-collection audit is built
export type PaymentMethod = 'paystack' | 'cash'

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van'

export type PackageSize = 'small' | 'medium' | 'large' | 'extra_large'

export type RiderStatus = 'pending' | 'approved' | 'suspended' | 'rejected'

export type NotificationType =
  | 'order_update'
  | 'chat_message'
  | 'payment'
  | 'promotion'
  | 'system'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected'

export type DisputeType =
  | 'missing_item'
  | 'damaged_item'
  | 'wrong_delivery'
  | 'late_delivery'
  | 'rider_conduct'
  | 'overcharge'
  | 'other'

export type KycStatus = 'pending' | 'submitted' | 'verified' | 'failed'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type CancelledBy = 'customer' | 'rider' | 'admin' | 'system'

export type SavedPaymentMethodType = 'card' | 'bank'
