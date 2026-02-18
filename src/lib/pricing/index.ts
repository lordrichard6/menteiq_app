/**
 * OrbitCRM Pricing Configuration
 *
 * 4-tier structure designed for sustainable margins:
 *
 *  Free       €0    —  1,000 tokens/mo  | 100 tokens/day cap | GPT-4o Mini only
 *  Pro        €29   — 50,000 tokens/mo  | no daily cap       | GPT-4o, Gemini, Sonnet
 *  Business   €79   — 200,000 tokens/mo | no daily cap       | All models excl. Opus 4
 *  Enterprise €199  — 500,000 tokens/mo | no daily cap       | All models incl. Opus 4
 *
 * Token multipliers apply effective cost pressure — Opus 4 (×10) on Enterprise
 * means 500K "effective" tokens ≈ 50K real Opus tokens (~€10 cost at $15/1M input).
 * This protects margin while keeping the headline number generous.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  price: number;              // EUR per month
  tokenAllocation: number;    // Monthly effective token pool (-1 = unlimited, removed)
  dailyCap: number;           // Free tier only; 0 = no daily cap
  maxUsers: number;
  storageGb: number;
  availableModels: AIModel[];
  maxPacks: number;           // -1 = unlimited
  features: string[];
  highlighted?: boolean;      // Show "Popular" badge
  ctaLabel: string;
  ctaHref: string;
}

export type AIModel =
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'claude-3-5-sonnet'
  | 'claude-opus-4'
  | 'gemini-pro';

export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  minimumTier: SubscriptionTier;
  /** Effective token multiplier — charged against token_balance as (real_tokens × multiplier) */
  tokenMultiplier: number;
  description: string;
  badge?: string;             // e.g. "Most Capable"
}

// ─── Tiers ───────────────────────────────────────────────────────────────────

export const TIER_ORDER: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];

export const tiers: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tokenAllocation: 1_000,
    dailyCap: 100,            // 100 tokens/day prevents single-session burnout
    maxUsers: 1,
    storageGb: 1,
    availableModels: ['gpt-4o-mini'],
    maxPacks: 0,
    ctaLabel: 'Start Free',
    ctaHref: 'https://app.orbitcrm.com/signup',
    features: [
      'CRM, Tasks, Invoicing',
      '1,000 AI tokens / month',
      '100 AI tokens / day',
      'GPT-4o Mini',
      'Swiss QR-Bill & EU IBAN',
      'Client portal (read-only)',
      'Community support',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    tokenAllocation: 50_000,
    dailyCap: 0,
    maxUsers: 1,
    storageGb: 10,
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
    maxPacks: 1,
    highlighted: true,
    ctaLabel: 'Get Started',
    ctaHref: 'https://app.orbitcrm.com/signup?plan=pro',
    features: [
      'Everything in Free',
      '50,000 AI tokens / month',
      'GPT-4o, Claude 3.5 Sonnet, Gemini Pro',
      'AI Knowledge Base (RAG)',
      'Document Vault (10 GB)',
      '1 vertical pack of choice',
      'Priority email support',
    ],
  },

  business: {
    id: 'business',
    name: 'Business',
    price: 79,
    tokenAllocation: 200_000,
    dailyCap: 0,
    maxUsers: 10,
    storageGb: 50,
    // Opus 4 deliberately excluded — too expensive to subsidise at this price point
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
    maxPacks: -1,
    ctaLabel: 'Get Started',
    ctaHref: 'https://app.orbitcrm.com/signup?plan=business',
    features: [
      'Everything in Pro',
      '200,000 AI tokens / month',
      'Up to 10 users',
      'Team collaboration',
      'All vertical packs',
      'Document Vault (50 GB)',
      'SLA support',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    tokenAllocation: 500_000,
    dailyCap: 0,
    maxUsers: -1,             // Unlimited users
    storageGb: 200,
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'claude-opus-4', 'gemini-pro'],
    maxPacks: -1,
    ctaLabel: 'Contact Sales',
    ctaHref: 'mailto:sales@orbitcrm.com',
    features: [
      'Everything in Business',
      '500,000 AI tokens / month',
      'Claude Opus 4 (most capable)',
      'Unlimited users',
      'Custom integrations',
      'Document Vault (200 GB)',
      'Dedicated account manager',
      'Custom SLA',
    ],
  },
};

// ─── Models ──────────────────────────────────────────────────────────────────

export const models: Record<AIModel, ModelConfig> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    minimumTier: 'free',
    tokenMultiplier: 1,
    description: 'Fast and efficient — great for everyday tasks',
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    minimumTier: 'pro',
    tokenMultiplier: 3,
    description: 'Balanced quality and speed',
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    minimumTier: 'pro',
    tokenMultiplier: 3,
    description: 'Excellent for writing, analysis, and long documents',
  },
  'claude-opus-4': {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    minimumTier: 'enterprise',
    tokenMultiplier: 10,      // ×10 protects margin: 500K eff. = 50K real Opus tokens
    description: 'Most capable model for complex reasoning',
    badge: 'Most Powerful',
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    minimumTier: 'pro',
    tokenMultiplier: 2,
    description: 'Google AI with broad up-to-date knowledge',
  },
};

// ─── Token Packs (add-ons) ────────────────────────────────────────────────────

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number;              // EUR one-time
  pricePerThousand: number;
  availableFrom: SubscriptionTier;
}

export const tokenPacks: TokenPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 25_000,
    price: 10,
    pricePerThousand: 0.40,
    availableFrom: 'pro',
  },
  {
    id: 'plus',
    name: 'Plus Pack',
    tokens: 100_000,
    price: 35,
    pricePerThousand: 0.35,
    availableFrom: 'pro',
  },
  {
    id: 'power',
    name: 'Power Pack',
    tokens: 500_000,
    price: 150,
    pricePerThousand: 0.30,
    availableFrom: 'business',
  },
];

// ─── Utility functions ────────────────────────────────────────────────────────

/** Check if a tier can access a model */
export function canAccessModel(tier: SubscriptionTier, modelId: AIModel): boolean {
  const model = models[modelId];
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(model.minimumTier);
}

/** Get all models available for a tier */
export function getAvailableModels(tier: SubscriptionTier): ModelConfig[] {
  return Object.values(models).filter(m => canAccessModel(tier, m.id));
}

/**
 * Calculate effective token cost after applying model multiplier.
 * This is what gets charged against the organisation's token_balance.
 */
export function calculateEffectiveTokens(realTokens: number, modelId: AIModel): number {
  return Math.ceil(realTokens * models[modelId].tokenMultiplier);
}

/** Check whether an org has sufficient effective tokens */
export function hasTokens(
  monthlyBalance: number,
  packBalance: number,
  required: number,
): boolean {
  return (monthlyBalance + packBalance) >= required;
}

/** Return the next tier up for an upgrade prompt */
export function getSuggestedUpgrade(currentTier: SubscriptionTier): SubscriptionTier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

/** Free tier: effective daily token allowance */
export const FREE_DAILY_CAP = tiers.free.dailyCap; // 100
