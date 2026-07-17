// Paystack signs every webhook with HMAC-SHA512 of the raw body using the
// secret key. The payload must never be trusted before this check passes.
export async function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === signature
}
