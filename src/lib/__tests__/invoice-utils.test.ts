import { describe, it, expect } from 'vitest'
import { calculateTotals } from '../invoices/totals'
import type { LineItemLike } from '../invoices/totals'

// ── calculateTotals ───────────────────────────────────────────────────────────

describe('calculateTotals — basic arithmetic', () => {
  it('returns zero totals for an empty array', () => {
    const result = calculateTotals([])
    expect(result.subtotal).toBe(0)
    expect(result.tax_total).toBe(0)
    expect(result.amount_total).toBe(0)
  })

  it('calculates a single item with 0% tax', () => {
    const items: LineItemLike[] = [{ quantity: 1, unit_price: 100, tax_rate: 0 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(100)
    expect(result.tax_total).toBe(0)
    expect(result.amount_total).toBe(100)
  })

  it('calculates a single item with 8.1% Swiss VAT', () => {
    const items: LineItemLike[] = [{ quantity: 1, unit_price: 1000, tax_rate: 8.1 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(1000)
    expect(result.tax_total).toBe(81)
    expect(result.amount_total).toBe(1081)
  })

  it('calculates a single item with 19% German VAT', () => {
    const items: LineItemLike[] = [{ quantity: 1, unit_price: 500, tax_rate: 19 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(500)
    expect(result.tax_total).toBe(95)
    expect(result.amount_total).toBe(595)
  })

  it('multiplies quantity × unit_price correctly', () => {
    const items: LineItemLike[] = [{ quantity: 5, unit_price: 200, tax_rate: 10 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(1000)
    expect(result.tax_total).toBe(100)
    expect(result.amount_total).toBe(1100)
  })

  it('sums multiple line items with different tax rates', () => {
    const items: LineItemLike[] = [
      { quantity: 1, unit_price: 100, tax_rate: 8.1 }, // subtotal 100, tax 8.10
      { quantity: 2, unit_price: 50, tax_rate: 19 },   // subtotal 100, tax 19.00
    ]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(200)
    expect(result.tax_total).toBe(27.1)
    expect(result.amount_total).toBe(227.1)
  })

  it('handles multiple items with 0% and non-0% tax', () => {
    const items: LineItemLike[] = [
      { quantity: 1, unit_price: 200, tax_rate: 0 },
      { quantity: 1, unit_price: 100, tax_rate: 20 },
    ]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(300)
    expect(result.tax_total).toBe(20)
    expect(result.amount_total).toBe(320)
  })

  it('amount_total equals subtotal + tax_total', () => {
    const items: LineItemLike[] = [
      { quantity: 3, unit_price: 79.99, tax_rate: 8.1 },
      { quantity: 1, unit_price: 49.5, tax_rate: 2.6 },
    ]
    const result = calculateTotals(items)
    // Verify the invariant regardless of rounding
    expect(result.amount_total).toBe(
      Math.round((result.subtotal + result.tax_total) * 100) / 100
    )
  })
})

describe('calculateTotals — rounding', () => {
  it('rounds subtotal to 2 decimal places', () => {
    // 3 × 0.10 = 0.30000...4 in floating point — must round to 0.30
    const items: LineItemLike[] = [{ quantity: 3, unit_price: 0.1, tax_rate: 0 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(0.3)
  })

  it('rounds tax_total to 2 decimal places', () => {
    // 100 × 8.1% = 8.1 exactly; 99 × 8.1% = 8.019 → 8.02
    const items: LineItemLike[] = [{ quantity: 1, unit_price: 99, tax_rate: 8.1 }]
    const result = calculateTotals(items)
    expect(result.tax_total).toBe(8.02)
  })

  it('rounds amount_total to 2 decimal places', () => {
    const items: LineItemLike[] = [{ quantity: 1, unit_price: 99, tax_rate: 8.1 }]
    const result = calculateTotals(items)
    // 99 + 8.019 = 107.019 → 107.02
    expect(result.amount_total).toBe(107.02)
  })

  it('handles fractional quantities correctly', () => {
    // 0.5 × 200 = 100
    const items: LineItemLike[] = [{ quantity: 0.5, unit_price: 200, tax_rate: 10 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(100)
    expect(result.tax_total).toBe(10)
    expect(result.amount_total).toBe(110)
  })
})

describe('calculateTotals — edge cases', () => {
  it('handles quantity of 0 (ghost line item)', () => {
    const items: LineItemLike[] = [{ quantity: 0, unit_price: 500, tax_rate: 8.1 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(0)
    expect(result.tax_total).toBe(0)
    expect(result.amount_total).toBe(0)
  })

  it('handles unit_price of 0', () => {
    const items: LineItemLike[] = [{ quantity: 10, unit_price: 0, tax_rate: 19 }]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(0)
    expect(result.tax_total).toBe(0)
    expect(result.amount_total).toBe(0)
  })

  it('handles large invoices without precision loss', () => {
    const items: LineItemLike[] = [
      { quantity: 1000, unit_price: 1500, tax_rate: 8.1 },
    ]
    const result = calculateTotals(items)
    expect(result.subtotal).toBe(1_500_000)
    expect(result.tax_total).toBe(121_500)
    expect(result.amount_total).toBe(1_621_500)
  })

  it('handles 10 identical line items the same as quantity × 10', () => {
    const singleLarge: LineItemLike[] = [{ quantity: 10, unit_price: 99.9, tax_rate: 7.7 }]
    const manySmall: LineItemLike[] = Array.from({ length: 10 }, () => ({
      quantity: 1,
      unit_price: 99.9,
      tax_rate: 7.7,
    }))

    const r1 = calculateTotals(singleLarge)
    const r2 = calculateTotals(manySmall)

    expect(r1.subtotal).toBe(r2.subtotal)
    expect(r1.tax_total).toBe(r2.tax_total)
    expect(r1.amount_total).toBe(r2.amount_total)
  })
})
