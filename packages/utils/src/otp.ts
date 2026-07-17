// HMAC-SHA256 of the OTP using the order ID as the key.
// Order ID as key means each order has a unique hash space, preventing
// a DB dump from revealing OTPs via a precomputed 10-000-entry rainbow table.
// Shared by generate-otp and verify-otp — the two must always produce
// identical hashes, which is why this lives in one place.
export async function hashOtpForOrder(otp: string, orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(orderId),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(otp))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
