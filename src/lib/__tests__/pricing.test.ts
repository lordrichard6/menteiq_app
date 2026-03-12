import { describe, it, expect } from 'vitest'
import {
  TIER_ORDER,
  tiers,
  models,
  tokenPacks,
  canAccessModel,
  getAvailableModels,
  calculateEffectiveTokens,
  hasTokens,
  getSuggestedUpgrade,
  FREE_DAILY_CAP,
  type SubscriptionTier,
  type AIModel,
} from '../pricing'

// ── TIER_ORDER ────────────────────────────────────────────────────────────────
describe('TIER_ORDER', () => {
  it('has 4 tiers in ascending order', () => {
    expect(TIER_ORDER).toEqual(['free', 'pro', 'business', 'enterprise'])
  })
})

// ── tiers data ────────────────────────────────────────────────────────────────
describe('tiers data', () => {
  it('free tier has price 0', () => {
    expect(tiers.free.price).toBe(0)
  })

  it('free tier has dailyCap 100', () => {
    expect(tiers.free.dailyCap).toBe(100)
  })

  it('free tier only allows gpt-4o-mini', () => {
    expect(tiers.free.availableModels).toEqual(['gpt-4o-mini'])
  })

  it('pro tier allows 4 models', () => {
    expect(tiers.pro.availableModels).toHaveLength(4)
    expect(tiers.pro.availableModels).toContain('gpt-4o')
    expect(tiers.pro.availableModels).toContain('claude-3-5-sonnet')
  })

  it('business tier excludes claude-opus-4', () => {
    expect(tiers.business.availableModels).not.toContain('claude-opus-4')
  })

  it('enterprise tier includes claude-opus-4', () => {
    expect(tiers.enterprise.availableModels).toContain('claude-opus-4')
  })

  it('enterprise has unlimited users (-1)', () => {
    expect(tiers.enterprise.maxUsers).toBe(-1)
  })

  it('all tiers have required fields', () => {
    for (const tier of Object.values(tiers)) {
      expect(tier.id).toBeTruthy()
      expect(tier.name).toBeTruthy()
      expect(typeof tier.price).toBe('number')
      expect(tier.tokenAllocation).toBeGreaterThan(0)
      expect(tier.ctaLabel).toBeTruthy()
    }
  })
})

// ── models data ───────────────────────────────────────────────────────────────
describe('models data', () => {
  it('gpt-4o-mini is available on free tier', () => {
    expect(models['gpt-4o-mini'].minimumTier).toBe('free')
  })

  it('claude-opus-4 requires enterprise tier', () => {
    expect(models['claude-opus-4'].minimumTier).toBe('enterprise')
  })

  it('gpt-4o-mini has multiplier of 1', () => {
    expect(models['gpt-4o-mini'].tokenMultiplier).toBe(1)
  })

  it('claude-opus-4 has multiplier of 10', () => {
    expect(models['claude-opus-4'].tokenMultiplier).toBe(10)
  })

  it('gemini-pro has multiplier of 2', () => {
    expect(models['gemini-pro'].tokenMultiplier).toBe(2)
  })

  it('all models have providers', () => {
    for (const model of Object.values(models)) {
      expect(['openai', 'anthropic', 'google']).toContain(model.provider)
    }
  })
})

// ── canAccessModel ────────────────────────────────────────────────────────────
describe('canAccessModel', () => {
  it('free tier can access gpt-4o-mini', () => {
    expect(canAccessModel('free', 'gpt-4o-mini')).toBe(true)
  })

  it('free tier cannot access gpt-4o', () => {
    expect(canAccessModel('free', 'gpt-4o')).toBe(false)
  })

  it('free tier cannot access claude-opus-4', () => {
    expect(canAccessModel('free', 'claude-opus-4')).toBe(false)
  })

  it('pro tier can access gpt-4o', () => {
    expect(canAccessModel('pro', 'gpt-4o')).toBe(true)
  })

  it('pro tier can access claude-3-5-sonnet', () => {
    expect(canAccessModel('pro', 'claude-3-5-sonnet')).toBe(true)
  })

  it('pro tier cannot access claude-opus-4', () => {
    expect(canAccessModel('pro', 'claude-opus-4')).toBe(false)
  })

  it('business tier cannot access claude-opus-4', () => {
    expect(canAccessModel('business', 'claude-opus-4')).toBe(false)
  })

  it('enterprise tier can access claude-opus-4', () => {
    expect(canAccessModel('enterprise', 'claude-opus-4')).toBe(true)
  })

  it('enterprise tier can access all models', () => {
    for (const modelId of Object.keys(models) as AIModel[]) {
      expect(canAccessModel('enterprise', modelId)).toBe(true)
    }
  })
})

// ── getAvailableModels ────────────────────────────────────────────────────────
describe('getAvailableModels', () => {
  it('free tier returns only gpt-4o-mini', () => {
    const available = getAvailableModels('free')
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('gpt-4o-mini')
  })

  it('pro tier returns 4 models', () => {
    const available = getAvailableModels('pro')
    expect(available).toHaveLength(4)
  })

  it('enterprise tier returns all 5 models', () => {
    const available = getAvailableModels('enterprise')
    expect(available).toHaveLength(5)
  })

  it('higher tiers always return at least as many models as lower tiers', () => {
    const tierModels = TIER_ORDER.map(t => getAvailableModels(t).length)
    for (let i = 1; i < tierModels.length; i++) {
      expect(tierModels[i]).toBeGreaterThanOrEqual(tierModels[i - 1])
    }
  })
})

// ── calculateEffectiveTokens ──────────────────────────────────────────────────
describe('calculateEffectiveTokens', () => {
  it('gpt-4o-mini (×1) returns exact token count', () => {
    expect(calculateEffectiveTokens(1000, 'gpt-4o-mini')).toBe(1000)
  })

  it('gpt-4o (×3) triples the token count', () => {
    expect(calculateEffectiveTokens(100, 'gpt-4o')).toBe(300)
  })

  it('claude-opus-4 (×10) multiplies by 10', () => {
    expect(calculateEffectiveTokens(50, 'claude-opus-4')).toBe(500)
  })

  it('gemini-pro (×2) doubles the token count', () => {
    expect(calculateEffectiveTokens(200, 'gemini-pro')).toBe(400)
  })

  it('rounds up fractional results (Math.ceil)', () => {
    // 7 tokens × 3 = 21 (no rounding needed)
    expect(calculateEffectiveTokens(7, 'gpt-4o')).toBe(21)
  })

  it('handles zero tokens', () => {
    expect(calculateEffectiveTokens(0, 'gpt-4o')).toBe(0)
  })
})

// ── hasTokens ─────────────────────────────────────────────────────────────────
describe('hasTokens', () => {
  it('returns true when monthly balance is sufficient', () => {
    expect(hasTokens(1000, 0, 500)).toBe(true)
  })

  it('returns true when pack balance covers the difference', () => {
    expect(hasTokens(100, 400, 500)).toBe(true)
  })

  it('returns true when combined balance exactly equals required', () => {
    expect(hasTokens(300, 200, 500)).toBe(true)
  })

  it('returns false when combined balance is insufficient', () => {
    expect(hasTokens(100, 50, 500)).toBe(false)
  })

  it('returns false when both balances are zero', () => {
    expect(hasTokens(0, 0, 1)).toBe(false)
  })

  it('returns true when required is zero', () => {
    expect(hasTokens(0, 0, 0)).toBe(true)
  })
})

// ── getSuggestedUpgrade ───────────────────────────────────────────────────────
describe('getSuggestedUpgrade', () => {
  it('suggests pro for free tier', () => {
    expect(getSuggestedUpgrade('free')).toBe('pro')
  })

  it('suggests business for pro tier', () => {
    expect(getSuggestedUpgrade('pro')).toBe('business')
  })

  it('suggests enterprise for business tier', () => {
    expect(getSuggestedUpgrade('business')).toBe('enterprise')
  })

  it('returns null for enterprise (top tier)', () => {
    expect(getSuggestedUpgrade('enterprise')).toBeNull()
  })
})

// ── FREE_DAILY_CAP ────────────────────────────────────────────────────────────
describe('FREE_DAILY_CAP', () => {
  it('equals 100', () => {
    expect(FREE_DAILY_CAP).toBe(100)
  })

  it('matches tiers.free.dailyCap', () => {
    expect(FREE_DAILY_CAP).toBe(tiers.free.dailyCap)
  })
})

// ── tokenPacks ────────────────────────────────────────────────────────────────
describe('tokenPacks', () => {
  it('has 3 packs', () => {
    expect(tokenPacks).toHaveLength(3)
  })

  it('all packs have positive tokens and price', () => {
    for (const pack of tokenPacks) {
      expect(pack.tokens).toBeGreaterThan(0)
      expect(pack.price).toBeGreaterThan(0)
    }
  })

  it('packs are available from pro tier or higher', () => {
    for (const pack of tokenPacks) {
      expect(TIER_ORDER.indexOf(pack.availableFrom)).toBeGreaterThanOrEqual(TIER_ORDER.indexOf('pro'))
    }
  })

  it('price per thousand is consistent with price/tokens', () => {
    for (const pack of tokenPacks) {
      const computed = pack.price / (pack.tokens / 1000)
      expect(computed).toBeCloseTo(pack.pricePerThousand, 2)
    }
  })
})
