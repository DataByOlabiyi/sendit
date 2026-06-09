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
  USERS: '/dashboard/users',
  RIDERS: '/dashboard/riders',
  ORDERS: '/dashboard/orders',
  PAYMENTS: '/dashboard/payments',
  PAYOUTS: '/dashboard/payouts',
  DISPUTES: '/dashboard/disputes',
  KYC: '/dashboard/kyc',
  ANALYTICS: '/dashboard/analytics',
  NOTIFICATIONS: '/dashboard/notifications',
  SETTINGS: '/dashboard/settings',
} as const

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY: '/auth/verify',
} as const
