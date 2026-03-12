# MenteIQ Modules

This directory contains the modular feature system for MenteIQ.

## Structure

```
/modules
  /core           # Always enabled for all tenants
    /contacts     # Contact management
    /projects     # Project management
    /invoicing    # Invoice generation (Swiss QR, EU IBAN)
    /ai-chat      # Multi-model AI chat
    /rag          # Document embedding and retrieval
    /tasks        # Task management
  /packs          # Opt-in per tenant (premium features)
    /consultant   # SOW templates, hourly tracking
    /insurance    # Policy tracking, renewal alerts
    /accounting   # Client vault, tax calendar
    /agency       # Team capacity, retainers
```

## Architecture

### Core Modules
Always enabled for all users. These provide the base functionality of MenteIQ.

### Vertical Packs
Premium modules that can be enabled per tenant based on their subscription tier:
- **Free tier:** Core modules only
- **Pro tier (€29/mo):** Core + 1 vertical pack
- **Business tier (€79/mo):** Core + all vertical packs

## Adding a New Module

1. Create a directory under `/core` or `/packs`
2. Include at minimum:
   - `index.ts` - Module exports
   - `types.ts` - TypeScript types
   - `README.md` - Module documentation
3. For packs, also add:
   - `config.ts` - Pack configuration and feature flags
   - Register in the tenant's `enabled_packs` array

## Pack Configuration

Each pack exports a configuration object:

```typescript
export const packConfig = {
  id: 'consultant',
  name: 'Consultant Pack',
  description: 'SOW templates, hourly tracking, proposal AI',
  features: ['sow_templates', 'hourly_tracking', 'proposal_ai'],
  tier: 'pro', // Minimum tier required
};
```
