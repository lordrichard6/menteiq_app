import { describe, it, expect } from 'vitest'
import {
  TAX_RATES,
  getTaxRatesForCountry,
  getDefaultTaxRate,
  getCurrencyForCountry,
  getVatLabel,
  formatTaxRate,
  getSupportedCountries,
} from '../invoices/tax-rates'

// ── getTaxRatesForCountry ─────────────────────────────────────────────────────
describe('getTaxRatesForCountry', () => {
  it('returns Swiss rates for "CH"', () => {
    const rates = getTaxRatesForCountry('CH')
    expect(rates.length).toBeGreaterThan(0)
    const standard = rates.find(r => r.type === 'standard')
    expect(standard?.rate).toBe(8.1)
  })

  it('is case-insensitive (lowercase "ch")', () => {
    const lower = getTaxRatesForCountry('ch')
    const upper = getTaxRatesForCountry('CH')
    expect(lower).toEqual(upper)
  })

  it('returns German rates for "DE"', () => {
    const rates = getTaxRatesForCountry('DE')
    const standard = rates.find(r => r.type === 'standard')
    expect(standard?.rate).toBe(19)
  })

  it('falls back to Swiss rates for unknown country', () => {
    const rates = getTaxRatesForCountry('XX')
    const swissRates = getTaxRatesForCountry('CH')
    expect(rates).toEqual(swissRates)
  })

  it('returns Portuguese rates for "PT"', () => {
    const rates = getTaxRatesForCountry('PT')
    const standard = rates.find(r => r.type === 'standard')
    expect(standard?.rate).toBe(23)
  })

  it('all returned rates have required fields', () => {
    for (const code of getSupportedCountries()) {
      const rates = getTaxRatesForCountry(code)
      for (const rate of rates) {
        expect(rate.label).toBeTruthy()
        expect(typeof rate.rate).toBe('number')
        expect(['standard', 'reduced', 'zero']).toContain(rate.type)
      }
    }
  })
})

// ── getDefaultTaxRate ─────────────────────────────────────────────────────────
describe('getDefaultTaxRate', () => {
  it('returns 8.1 for Switzerland', () => {
    expect(getDefaultTaxRate('CH')).toBe(8.1)
  })

  it('returns 19 for Germany', () => {
    expect(getDefaultTaxRate('DE')).toBe(19)
  })

  it('returns 20 for Austria', () => {
    expect(getDefaultTaxRate('AT')).toBe(20)
  })

  it('returns 20 for France', () => {
    expect(getDefaultTaxRate('FR')).toBe(20)
  })

  it('returns 22 for Italy', () => {
    expect(getDefaultTaxRate('IT')).toBe(22)
  })

  it('returns 23 for Portugal', () => {
    expect(getDefaultTaxRate('PT')).toBe(23)
  })

  it('falls back to Swiss rate for unknown country', () => {
    expect(getDefaultTaxRate('ZZ')).toBe(8.1)
  })

  it('returns a positive number for all supported countries', () => {
    for (const code of getSupportedCountries()) {
      expect(getDefaultTaxRate(code)).toBeGreaterThan(0)
    }
  })
})

// ── getCurrencyForCountry ─────────────────────────────────────────────────────
describe('getCurrencyForCountry', () => {
  it('returns CHF for Switzerland', () => {
    expect(getCurrencyForCountry('CH')).toBe('CHF')
  })

  it('returns EUR for Germany', () => {
    expect(getCurrencyForCountry('DE')).toBe('EUR')
  })

  it('returns EUR for France', () => {
    expect(getCurrencyForCountry('FR')).toBe('EUR')
  })

  it('returns EUR for Portugal', () => {
    expect(getCurrencyForCountry('PT')).toBe('EUR')
  })

  it('returns EUR as default for unknown countries', () => {
    expect(getCurrencyForCountry('XX')).toBe('EUR')
  })

  it('is case-insensitive', () => {
    expect(getCurrencyForCountry('ch')).toBe('CHF')
    expect(getCurrencyForCountry('de')).toBe('EUR')
  })
})

// ── getVatLabel ───────────────────────────────────────────────────────────────
describe('getVatLabel', () => {
  it('returns "MWST" for Switzerland', () => {
    expect(getVatLabel('CH')).toBe('MWST')
  })

  it('returns "USt" for Germany', () => {
    expect(getVatLabel('DE')).toBe('USt')
  })

  it('returns "TVA" for France', () => {
    expect(getVatLabel('FR')).toBe('TVA')
  })

  it('returns "IVA" for Italy', () => {
    expect(getVatLabel('IT')).toBe('IVA')
  })

  it('returns "IVA" for Portugal', () => {
    expect(getVatLabel('PT')).toBe('IVA')
  })

  it('returns "BTW" for Netherlands', () => {
    expect(getVatLabel('NL')).toBe('BTW')
  })

  it('returns "VAT" as fallback for unknown country', () => {
    expect(getVatLabel('XX')).toBe('VAT')
  })
})

// ── formatTaxRate ─────────────────────────────────────────────────────────────
describe('formatTaxRate', () => {
  it('formats integer rates with %', () => {
    expect(formatTaxRate(19)).toBe('19%')
    expect(formatTaxRate(0)).toBe('0%')
    expect(formatTaxRate(20)).toBe('20%')
  })

  it('formats decimal rates', () => {
    expect(formatTaxRate(8.1)).toBe('8.1%')
    expect(formatTaxRate(2.6)).toBe('2.6%')
    expect(formatTaxRate(5.5)).toBe('5.5%')
  })
})

// ── getSupportedCountries ─────────────────────────────────────────────────────
describe('getSupportedCountries', () => {
  it('returns at least 10 country codes', () => {
    expect(getSupportedCountries().length).toBeGreaterThanOrEqual(10)
  })

  it('includes Switzerland', () => {
    expect(getSupportedCountries()).toContain('CH')
  })

  it('includes Germany', () => {
    expect(getSupportedCountries()).toContain('DE')
  })

  it('includes Portugal', () => {
    expect(getSupportedCountries()).toContain('PT')
  })

  it('returns all keys from TAX_RATES', () => {
    expect(getSupportedCountries()).toEqual(Object.keys(TAX_RATES))
  })
})
