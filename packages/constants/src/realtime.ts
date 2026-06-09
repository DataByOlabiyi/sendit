export const REALTIME_CHANNELS = {
  ORDER: (id: string) => `order:${id}`,
  RIDER_LOCATION: (riderId: string) => `rider_location:${riderId}`,
  CHAT: (orderId: string) => `chat:${orderId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
} as const
