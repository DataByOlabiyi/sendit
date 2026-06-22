export const PRICING = {
  BASE_FEE: 500, // NGN
  PER_KM_FEE: 100, // NGN per km
  INSURANCE_FEE: 200, // NGN flat
  PLATFORM_COMMISSION: 0.15, // 15%
} as const

export const PACKAGE_SIZE_LABELS = {
  small: 'Small (fits in a backpack)',
  medium: 'Medium (shoebox size)',
  large: 'Large (suitcase size)',
  extra_large: 'Extra Large (requires a van)',
} as const

export const PACKAGE_SIZE_MULTIPLIER = {
  small: 1,
  medium: 1.2,
  large: 1.5,
  extra_large: 2,
} as const

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed_delivery: 'Failed Delivery',
  return_in_progress: 'Returning',
  returned: 'Returned',
} as const

export const VEHICLE_TYPE_LABELS = {
  bicycle: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  van: 'Van',
} as const

export const RIDER_STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Approved',
  suspended: 'Suspended',
  rejected: 'Rejected',
} as const

export const DISPUTE_STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
} as const

export const ORDER_STATUS_COLORS = {
  pending: 'yellow',
  accepted: 'blue',
  picked_up: 'purple',
  in_transit: 'orange',
  delivered: 'green',
  cancelled: 'red',
  failed_delivery: 'red',
  return_in_progress: 'gray',
  returned: 'gray',
} as const
