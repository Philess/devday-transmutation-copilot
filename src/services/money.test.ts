import { describe, expect, it } from 'vitest'
import { UNREPRESENTABLE_AMOUNT_MESSAGE, orderTotalCents } from './money'

describe('cent totals', () => {
  it('sums exact integer cent totals', () => {
    expect(orderTotalCents([{ quantity: 3, unitPriceCents: 2840 }, { quantity: 1, unitPriceCents: 68400 }])).toBe(76920)
  })

  it('rejects line products and cumulative totals beyond exact integers', () => {
    const price = 68400
    const overflowingQuantity = Math.floor(Number.MAX_SAFE_INTEGER / price) + 1
    expect(() => orderTotalCents([{ quantity: overflowingQuantity, unitPriceCents: price }])).toThrow(UNREPRESENTABLE_AMOUNT_MESSAGE)
    const half = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1
    expect(() => orderTotalCents([
      { quantity: half, unitPriceCents: 1 },
      { quantity: half, unitPriceCents: 1 }
    ])).toThrow(UNREPRESENTABLE_AMOUNT_MESSAGE)
  })
})
