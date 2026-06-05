// --- Pricing -----------------------------------------------------------------

export const PRICING = {
  BASE_FEE: 500, // NGN
  PER_KM_FEE: 100, // NGN per km
  INSURANCE_FEE: 200, // NGN flat
  PLATFORM_COMMISSION: 0.15, // 15%
} as const

// --- Package Sizes -----------------------------------------------------------

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

// --- Order Status Labels -----------------------------------------------------

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} as const

export const ORDER_STATUS_COLORS = {
  pending: 'yellow',
  accepted: 'blue',
  picked_up: 'purple',
  in_transit: 'orange',
  delivered: 'green',
  cancelled: 'red',
} as const

// --- Limits ------------------------------------------------------------------

export const LIMITS = {
  MAX_ADDRESSES: 10,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_CHAT_ATTACHMENT_SIZE_MB: 10,
  MAX_SPECIAL_INSTRUCTIONS_LENGTH: 500,
  MIN_PASSWORD_LENGTH: 8,
} as const

// --- Routes ------------------------------------------------------------------

export const CUSTOMER_ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  BOOK: '/book',
  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  TRACK: (id: string) => `/track/${id}`,
  PROFILE: '/profile',
  ADDRESSES: '/addresses',
  NOTIFICATIONS: '/notifications',
  CHAT: (orderId: string) => `/chat/${orderId}`,
} as const

export const RIDER_ROUTES = {
  DASHBOARD: '/rider/dashboard',
  ORDERS: '/rider/orders',
  ORDER_DETAIL: (id: string) => `/rider/orders/${id}`,
  EARNINGS: '/rider/earnings',
  PROFILE: '/rider/profile',
} as const

export const ADMIN_ROUTES = {
  DASHBOARD: '/dashboard',
  USERS: '/users',
  RIDERS: '/riders',
  ORDERS: '/orders',
  PAYMENTS: '/payments',
  ANALYTICS: '/analytics',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
} as const

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY: '/auth/verify',
} as const

// --- Storage Buckets ---------------------------------------------------------

export const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  RIDER_DOCUMENTS: 'rider-documents',
  PROOF_OF_DELIVERY: 'proof-of-delivery',
  CHAT_ATTACHMENTS: 'chat-attachments',
} as const

// --- Realtime Channels -------------------------------------------------------

export const REALTIME_CHANNELS = {
  ORDER: (id: string) => `order:${id}`,
  RIDER_LOCATION: (riderId: string) => `rider_location:${riderId}`,
  CHAT: (orderId: string) => `chat:${orderId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
} as const
