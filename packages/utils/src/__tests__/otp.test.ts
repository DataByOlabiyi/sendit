import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { hashOtpForOrder } from '../otp'

const ORDER_ID = 'a3f1c2d4-5678-4abc-9def-0123456789ab'

describe('hashOtpForOrder', () => {
  it('matches an independent HMAC-SHA256 implementation (key = order ID)', async () => {
    const expected = createHmac('sha256', ORDER_ID).update('1234').digest('hex')
    expect(await hashOtpForOrder('1234', ORDER_ID)).toBe(expected)
  })

  it('is deterministic for the same OTP and order', async () => {
    expect(await hashOtpForOrder('0042', ORDER_ID)).toBe(await hashOtpForOrder('0042', ORDER_ID))
  })

  it('produces 64-char lowercase hex', async () => {
    expect(await hashOtpForOrder('9999', ORDER_ID)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs across OTPs', async () => {
    expect(await hashOtpForOrder('1234', ORDER_ID)).not.toBe(await hashOtpForOrder('1235', ORDER_ID))
  })

  it('differs across orders for the same OTP — no shared rainbow table', async () => {
    const otherOrder = 'b4e2d3c5-6789-4bcd-8aef-1234567890bc'
    expect(await hashOtpForOrder('1234', ORDER_ID)).not.toBe(await hashOtpForOrder('1234', otherOrder))
  })
})
