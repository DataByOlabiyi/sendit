import { describe, it, expect } from 'vitest'
import { generateOrderReference } from '../orders'

describe('generateOrderReference', () => {
  it('starts with SDT-', () => {
    expect(generateOrderReference()).toMatch(/^SDT-/)
  })

  it('generates unique references', () => {
    const refs = new Set(Array.from({ length: 50 }, () => generateOrderReference()))
    expect(refs.size).toBe(50)
  })

  it('contains only URL-safe characters', () => {
    const ref = generateOrderReference()
    expect(ref).toMatch(/^[A-Z0-9-]+$/)
  })
})
