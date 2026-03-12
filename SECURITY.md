# Security Policy

## Supported Versions

MenteIQ is currently in active development. Security patches are applied to the `main` branch only.

| Version | Supported |
|---------|-----------|
| latest  | ✅ Yes     |

## Reporting a Vulnerability

If you discover a security vulnerability in MenteIQ, please **do not open a public GitHub issue**.

Instead, report it confidentially by emailing:

**security@menteiq.ch**

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any proof-of-concept code (if applicable)

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix or mitigation | Within 30 days for critical issues |
| Disclosure | Coordinated with reporter |

## Scope

**In scope:**
- Authentication and authorization bypasses
- SQL injection / RLS policy bypasses (Supabase)
- Cross-site scripting (XSS) in user-generated content
- Server-side request forgery (SSRF)
- Data exposure (unauthorized access to other tenants' data)
- Stripe webhook signature bypass
- Insecure direct object references (IDOR)

**Out of scope:**
- Social engineering attacks
- Denial of service (DoS/DDoS)
- Issues affecting only outdated browsers
- Self-XSS
- Rate limiting on non-critical endpoints

## Security Measures

- **Multi-tenancy**: All data is scoped by `tenant_id` via Supabase Row Level Security (RLS)
- **Auth**: Supabase Auth with JWT verification on every API call
- **CSP**: Content Security Policy headers enforced (no `unsafe-eval` in production)
- **HSTS**: Strict-Transport-Security with 2-year max-age and preload
- **Input validation**: Zod schemas on all API inputs; `sanitizeHtml()` for user HTML content
- **Stripe webhooks**: Signature verification via `stripe.webhooks.constructEvent()`
- **Secrets**: All secrets in environment variables; `.env*` excluded from git
- **Dependencies**: `npm audit` runs in CI; critical vulnerabilities block deployment
- **GDPR**: Right to erasure API endpoint; IP/email stripped from Sentry events

## Acknowledgements

We thank security researchers who responsibly disclose vulnerabilities. Confirmed reporters will be credited in release notes unless they prefer to remain anonymous.
