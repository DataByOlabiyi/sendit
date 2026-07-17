import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPaystackSignature } from '../paystack'

const SECRET = 'sk_test_1234567890abcdef'
const BODY = JSON.stringify({ event: 'charge.success', data: { reference: 'SDT-abc', amount: 150000 } })

function sign(body: string, secret: string): string {
  return createHmac('sha512', secret).update(body).digest('hex')
}

describe('verifyPaystackSignature', () => {
  it('accepts a signature produced with the secret key', async () => {
    expect(await verifyPaystackSignature(BODY, sign(BODY, SECRET), SECRET)).toBe(true)
  })

  it('rejects a tampered body', async () => {
    const tampered = BODY.replace('150000', '1500')
    expect(await verifyPaystackSignature(tampered, sign(BODY, SECRET), SECRET)).toBe(false)
  })

  it('rejects a signature made with a different secret', async () => {
    expect(await verifyPaystackSignature(BODY, sign(BODY, 'sk_test_wrong'), SECRET)).toBe(false)
  })

  it('rejects an empty signature', async () => {
    expect(await verifyPaystackSignature(BODY, '', SECRET)).toBe(false)
  })

  it('rejects an uppercase-hex signature (comparison is exact)', async () => {
    expect(await verifyPaystackSignature(BODY, sign(BODY, SECRET).toUpperCase(), SECRET)).toBe(false)
  })
})
