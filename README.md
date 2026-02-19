<div align="center">

<img src="public/menteiq_logo.svg" alt="MenteIQ Logo" width="220" />

<br />
<br />

# MenteIQ — AI Business Command Center

**The Operating System for European Service Professionals**

*AI-native CRM · Smart Invoicing · RAG Knowledge Base · Client Portal*

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Zurich-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Swiss Made](https://img.shields.io/badge/🇨🇭_Swiss--Made-Software-E30613)](https://menteiq.ch)
[![GDPR](https://img.shields.io/badge/GDPR-Compliant-4CAF50)](https://menteiq.ch/privacy)
[![nDSG](https://img.shields.io/badge/nDSG-Compliant-4CAF50)](https://menteiq.ch/privacy)
[![Data](https://img.shields.io/badge/Data_Stored_in-Switzerland_🇨🇭-E30613)](https://menteiq.ch/privacy)

<br />

[**Live App**](https://app.menteiq.ch) · [**Marketing Site**](https://menteiq.ch) · [**Report an Issue**](https://github.com/lordrichard6/menteiq_app/issues)

<br />

---

</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Deployments](#-live-deployments)
- [Core Features](#-core-features)
- [Tech Stack](#-tech-stack)
- [Data Protection & Compliance](#-data-protection--compliance)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [AI & RAG System](#-ai--rag-system)
- [Invoicing System](#-invoicing-system)
- [Client Portal](#-client-portal)
- [Project Management](#-project-management)
- [Vertical Packs](#-vertical-packs)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [About](#-about)

---

## 🧠 Overview

MenteIQ is a **fully AI-native business operating system** built from the ground up for European consultants, freelancers, accountants, insurance brokers, and agencies. Unlike legacy CRMs with AI bolted on as an afterthought, MenteIQ's AI is the primary interface — every action, every workflow, every document is accessible through natural language.

### The Problem We Solve

| Pain Point | Industry Status Quo | MenteIQ |
|---|---|---|
| CRM cost | Salesforce at €150+/user/mo | From €0 |
| AI integration | ChatGPT sidebar bolted on | AI-native, Day 1 |
| Swiss compliance | None or expensive add-ons | Built-in natively |
| EU VAT & QR-Bill | Separate tools required | Core feature |
| Data sovereignty | US servers, unclear GDPR | Switzerland 🇨🇭 only |
| Setup time | Days to weeks | < 7 minutes |

---

## 🌐 Live Deployments

| Environment | URL | Status |
|---|---|---|
| **Production App** | [app.menteiq.ch](https://app.menteiq.ch) | [![Vercel](https://img.shields.io/badge/Live-Online-brightgreen)](https://app.menteiq.ch) |
| **Marketing Website** | [menteiq.ch](https://menteiq.ch) | [![Vercel](https://img.shields.io/badge/Live-Online-brightgreen)](https://menteiq.ch) |
| **Database** | Supabase Zurich (eu-central-2) | 🇨🇭 Swiss |

---

## ✨ Core Features

### 🤖 AI Command Center
- **Multi-model AI** — GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash — switchable per conversation
- **Natural language actions** — *"Draft a follow-up email for all inactive leads"*, *"Create an invoice for the Ribeiro project"*, *"Summarise everything about [client]"*
- **Context-aware** — AI has access to your contacts, projects, and documents
- **Streaming responses** — Real-time output via Vercel AI SDK
- **Token metering** — Usage tracked per model with multipliers (GPT-4o: 3×, Opus: 10×)
- **AI Omnibox (Cmd+K)** — Command palette with AI-powered actions

### 📚 RAG Knowledge Base
- **Upload any document** — PDF, DOCX, TXT, MD, Excel, CSV
- **Automatic processing** — Text extraction → chunking → vector embedding → indexed
- **Semantic search** — pgvector-powered similarity search across all documents
- **Source citations** — Every AI answer cites the exact source document and chunk
- **Document vault** — Organised per-contact and per-project with access control
- **10 GB storage** (Pro) / 50 GB (Business) / 200 GB (Enterprise)

### 👥 CRM & Contact Management
- **Hybrid Party Model** — Persons and Organisations in one unified model
- **Pipeline Kanban** — Drag-and-drop deal stages (Lead → Prospect → Active → Closed)
- **Advanced filters** — Filter by status, tags, country, last activity, custom fields
- **Contact timeline** — Full activity history: emails, calls, notes, invoices, tasks
- **Smart deduplication** — Find and merge duplicate contacts
- **CSV/Excel/vCard import** — With column mapping and validation
- **GDPR consent tracking** — Per-contact consent records with timestamps
- **Soft delete** — Contacts archived, not destroyed; restoreable

### 🧾 Swiss & EU Invoicing
- **Swiss QR-Bill** — Native generation compliant with SIX standards (swissqrbill library)
- **EU SEPA invoicing** — IBAN-based payment references
- **Multi-country VAT** — CH (8.1%), PT (23%), DE (19%), FR (20%), AT (20%), and more
- **Invoice PDF generation** — Professional PDFs with full branding
- **Stripe integration** — Payment links per invoice + webhook status sync
- **Line items** — Quantity, unit price, VAT per line
- **Invoice status** — Draft → Sent → Viewed → Paid → Overdue

### 📁 Project Management
- **Kanban board** — Task management by status
- **Timeline / Gantt view** — Visual project planning
- **Milestones** — Key deliverable tracking with deadline badges
- **Budget tracking** — Planned vs. actual spend
- **Time entries** — Log hours per task/project; weekly timesheet view
- **Task dependencies** — Block/depends-on relationships
- **Team members** — Assign roles (owner/manager/member) per project
- **Recurring projects** — Auto-create from schedule
- **Custom fields** — Extend any project with type-safe metadata
- **Soft delete** — Projects archived, not destroyed

### 🔔 Notifications & Activity
- **Real-time notifications** — In-app notification bell with unread count
- **Activity log** — Organisation-wide audit trail of all actions
- **Notification triggers** — Rule-based alerts (invoice overdue, task deadline, etc.)
- **Email notifications** — Via Resend for critical events

### 🌐 Client Portal
- **Magic link authentication** — Secure, passwordless portal access for clients
- **Single-use tokens** — 1-hour expiry, invalidated after use
- **Portal dashboard** — Clients see only their own invoices, documents, and projects
- **Portal invitations** — Send branded email invites directly from contact view
- **Document sharing** — Share specific files with clients without giving full access
- **Portal toggle** — Enable/disable per contact with one click

### 🔒 GDPR & Privacy Tools
- **Data export** — Full JSON/ZIP export of all user data (contacts, invoices, docs)
- **GDPR deletion** — Request complete data erasure, compliant with right to be forgotten
- **Consent management** — Per-contact consent records for marketing, processing, data sharing
- **Activity audit trail** — Every action logged with user, timestamp, IP
- **Cookie consent** — Compliant banner with granular controls

### 🔍 Search & Navigation
- **Global search** — Full-text search across contacts, projects, invoices, documents
- **Command palette (Cmd+K)** — Keyboard-first navigation and quick actions
- **Fuzzy search** — Fuse.js powered for typo-tolerant results

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 4.0 |
| UI Components | shadcn/ui + Radix UI | latest |
| Icons | Lucide React | 0.562 |
| Drag & Drop | dnd-kit | 6.3 / 10.0 |
| State | Zustand | 5.0 |
| Server State | TanStack React Query | 5.90 |
| RPC | tRPC | 11.8 |

### Backend & Database

| Layer | Technology | Detail |
|---|---|---|
| Database | Supabase (PostgreSQL) | Zurich, eu-central-2 |
| Authentication | Supabase Auth | Email + Google OAuth |
| Vector Search | pgvector | Semantic document search |
| Row-Level Security | Supabase RLS | Tenant-level isolation |
| ORM | Supabase JS Client | v2.90 |
| File Storage | Supabase Storage | Per-org buckets |

### AI & LLM

| Provider | Models | SDK |
|---|---|---|
| OpenAI | GPT-4o, GPT-4 Turbo, GPT-4o Mini | @ai-sdk/openai |
| Anthropic | Claude 3.5 Sonnet, Claude Opus 4, Haiku | @ai-sdk/anthropic |
| Google | Gemini 2.0 Flash, Gemini Pro | @ai-sdk/google |
| Framework | Vercel AI SDK | ai@6 |

### Document Processing

| Task | Library |
|---|---|
| PDF text extraction | pdf-parse |
| PDF generation | pdfkit |
| DOCX parsing | mammoth |
| Excel/CSV parsing | xlsx, papaparse |
| Swiss QR-Bill | swissqrbill |
| QR Codes | qrcode |

### Integrations

| Service | Purpose |
|---|---|
| Stripe | Payments, subscriptions, webhooks |
| Resend | Transactional email |
| Zefix API | Swiss company lookup (auto-fill) |
| Google OAuth | Social login |

---

## 🔐 Data Protection & Compliance

> **Your data never leaves Switzerland.** MenteIQ is hosted exclusively on Supabase infrastructure in **Zurich (eu-central-2)**, giving you the strongest data privacy protections in the world.

### Compliance Framework

| Standard | Status | Detail |
|---|---|---|
| 🇨🇭 **Swiss nDSG** | ✅ Compliant | Swiss Federal Act on Data Protection (Datenschutzgesetz) |
| 🇪🇺 **GDPR** | ✅ Compliant | EU General Data Protection Regulation 2016/679 |
| 🏦 **Swiss QR-Bill** | ✅ Native | SIX Payment Services standards |
| 💳 **PCI DSS** | ✅ via Stripe | No card data ever stored on MenteIQ servers |

### Technical Security Measures

- **Row-Level Security (RLS)** — Every database query is scoped to the user's organisation. Zero cross-tenant data leakage possible at the database level.
- **Tenant isolation** — All tables have `tenant_id` foreign keys enforced by Postgres constraints
- **Encrypted secrets** — Service role key stored as sensitive env var (never in code or logs)
- **HTTPS only** — All traffic enforced via Vercel Edge with HSTS
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- **Auth middleware** — All admin routes protected by Supabase session verification on every request
- **Magic link portals** — Single-use tokens with 1-hour TTL for client access
- **Soft deletes** — Data is never permanently destroyed without explicit GDPR deletion request

### GDPR Built-In Features

- ✅ **Right to access** — Export all personal data as JSON/ZIP
- ✅ **Right to erasure** — Full GDPR deletion via `/api/gdpr/delete`
- ✅ **Data portability** — Structured export of all records
- ✅ **Consent records** — Per-contact consent tracking with timestamps and source
- ✅ **Cookie consent** — Granular opt-in/opt-out banner
- ✅ **Audit trail** — All data access and modifications logged

### Data Storage

```
Database:  Supabase PostgreSQL — Zurich, Switzerland (eu-central-2)
Files:     Supabase Storage — Zurich, Switzerland (eu-central-2)
CDN:       Vercel Edge Network (static assets only, no personal data)
Email:     Resend (transactional only, no personal data stored)
Payments:  Stripe (PCI DSS Level 1, no card data on MenteIQ servers)
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  Next.js App Router · React 19 · Zustand · TanStack Query   │
└─────────────────────┬────────────────────────────┬──────────┘
                      │                            │
           ┌──────────▼──────────┐    ┌───────────▼──────────┐
           │   Server Components  │    │   Client Components   │
           │   (RSC / tRPC)      │    │   (useActionState)    │
           └──────────┬──────────┘    └───────────┬──────────┘
                      │                            │
┌─────────────────────▼────────────────────────────▼──────────┐
│                    NEXT.JS API LAYER                          │
│  /api/chat  /api/documents  /api/contacts  /api/invoices     │
│  /api/portal  /api/gdpr  /api/webhooks/stripe  /api/trpc     │
└──────┬─────────────┬──────────────┬──────────────┬──────────┘
       │             │              │              │
  ┌────▼────┐  ┌─────▼─────┐ ┌────▼────┐  ┌─────▼──────┐
  │ Vercel  │  │ Supabase  │ │  AI SDK │  │   Stripe   │
  │  AI SDK │  │ (Zurich)  │ │ OpenAI  │  │  + Resend  │
  │ Stream  │  │ Postgres  │ │ Claude  │  │            │
  └─────────┘  │ pgvector  │ │ Gemini  │  └────────────┘
               │ Auth/RLS  │ └─────────┘
               └───────────┘
```

### Multi-tenancy Model

Every user belongs to an **organisation** (`tenant_id`). All data — contacts, invoices, projects, documents, conversations — is scoped to the organisation. Row-Level Security enforces this at the database level; even a compromised API key cannot access another tenant's data.

```
auth.users (Supabase Auth)
    └── profiles (tenant_id → organizations.id)
            └── organizations
                    ├── contacts
                    ├── projects
                    │       ├── tasks
                    │       ├── milestones
                    │       └── time_entries
                    ├── invoices
                    │       └── invoice_line_items
                    ├── documents
                    │       └── document_chunks (pgvector)
                    ├── ai_conversations
                    │       └── ai_messages
                    ├── portal_sessions
                    ├── contact_consent
                    ├── activity_logs
                    └── usage_logs
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Description | Key Columns |
|---|---|---|
| `organizations` | Multi-tenancy root | `id`, `name`, `slug`, `subscription_tier`, `token_balance` |
| `profiles` | User accounts | `id`, `email`, `full_name`, `role`, `tenant_id` |
| `contacts` | CRM contacts | `id`, `type`, `full_name`, `email`, `pipeline_status`, `tags`, `tenant_id` |
| `invoices` | Invoices | `id`, `contact_id`, `status`, `amount`, `iban`, `qr_bill_data`, `stripe_payment_link` |
| `invoice_line_items` | Line items | `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `vat_rate` |
| `projects` | Projects | `id`, `name`, `status`, `budget`, `deadline`, `tenant_id` |
| `tasks` | Tasks | `id`, `project_id`, `title`, `status`, `priority`, `assignee_id`, `due_date` |
| `milestones` | Project milestones | `id`, `project_id`, `title`, `due_date`, `completed_at` |
| `time_entries` | Time tracking | `id`, `project_id`, `task_id`, `user_id`, `minutes`, `description` |
| `documents` | Uploaded files | `id`, `name`, `file_type`, `storage_path`, `contact_id`, `project_id` |
| `document_chunks` | RAG chunks | `id`, `document_id`, `content`, `embedding` (vector(1536)) |
| `ai_conversations` | Chat sessions | `id`, `title`, `model`, `tenant_id` |
| `ai_messages` | Chat messages | `id`, `conversation_id`, `role`, `content`, `tokens_used` |
| `usage_logs` | Token tracking | `id`, `user_id`, `model`, `tokens_used`, `action_type` |
| `portal_sessions` | Client portal | `id`, `contact_id`, `token`, `expires_at`, `used_at` |
| `contact_consent` | GDPR consent | `id`, `contact_id`, `consent_type`, `granted_at`, `source` |
| `activity_logs` | Audit trail | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata` |
| `notifications` | In-app alerts | `id`, `user_id`, `type`, `message`, `read_at` |

### Vector Search

```sql
-- Find document chunks semantically similar to a query vector
SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
FROM document_chunks
WHERE tenant_id = $1
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

---

## 📡 API Reference

### AI & Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Streaming AI chat (multi-model) |
| `POST` | `/api/ai/embed` | Generate vector embedding |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload document to storage |
| `POST` | `/api/documents/process` | Extract text + generate embeddings |
| `GET` | `/api/documents/search` | Vector similarity search |

### Contacts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/contacts/import` | Bulk import from CSV/Excel/vCard |
| `GET` | `/api/contacts/export` | Export all contacts |
| `POST` | `/api/contacts/:id/export` | Export single contact (GDPR) |
| `POST` | `/api/contacts/:id/gdpr-delete` | GDPR erasure |
| `POST` | `/api/contacts/duplicates` | Find duplicate contacts |

### Invoices

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/invoices/:id/download` | Download PDF (owner) |
| `POST` | `/api/invoices/:id/payment-link` | Generate Stripe payment link |

### Client Portal

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/portal/invite` | Send magic link invitation |
| `POST` | `/api/portal/verify` | Verify portal token |
| `POST` | `/api/portal/toggle` | Enable/disable portal access |
| `GET` | `/api/portal/invoices/:id/download` | Portal invoice PDF |
| `GET` | `/api/portal/documents/:id/download` | Portal document |

### GDPR

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/gdpr/export` | Export all user data |
| `POST` | `/api/gdpr/delete` | Request complete erasure |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Handle Stripe payment events |

---

## 🧠 AI & RAG System

### Document Processing Pipeline

```
User uploads file (PDF/DOCX/TXT/MD/XLSX)
        ↓
Text extraction (pdf-parse / mammoth / xlsx)
        ↓
Chunking (recursive, ~500 tokens/chunk, 50-token overlap)
        ↓
Embedding generation (OpenAI text-embedding-3-small → 1536 dimensions)
        ↓
Store in document_chunks (pgvector column)
        ↓
Available for semantic search in AI chat
```

### RAG Chat Flow

```
User sends message
        ↓
Generate query embedding
        ↓
Vector similarity search → top 5 relevant chunks
        ↓
Inject chunks as context into AI prompt
        ↓
Model generates answer with source citations
        ↓
Stream response to client
        ↓
Log tokens used to usage_logs
```

### Token System

| Plan | Monthly Tokens | Daily Cap | Models |
|---|---|---|---|
| Free | 1,000 | 100 | GPT-4o Mini (1×) |
| Pro | 50,000 | None | GPT-4o (3×), Claude 3.5 (3×), Gemini (1×) |
| Business | 200,000 | None | All Pro models |
| Enterprise | 500,000 | None | + Claude Opus 4 (10×) |

Model multipliers reflect real API cost differences. Token balance enforced at database level via RLS check on every AI request.

---

## 🧾 Invoicing System

### Swiss QR-Bill

MenteIQ generates fully compliant Swiss QR-Bills (v2.0) using the [swissqrbill](https://www.npmjs.com/package/swissqrbill) library:

- IBAN validation (CH/LI accounts)
- QR-IBAN support
- Structured/unstructured reference numbers
- Multi-language bill labels (DE/FR/IT/EN)
- SVG + PDF output

### EU SEPA Invoicing

For non-Swiss payments:
- IBAN + BIC reference generation
- Country-specific VAT rates auto-applied
- EUR/CHF/GBP currency support

### Stripe Integration

```
Create invoice → Generate payment link → Customer pays →
Stripe webhook → Update invoice status → Notify owner
```

Supported events: `payment_intent.succeeded`, `invoice.paid`, `checkout.session.completed`

---

## 🌐 Client Portal

The Client Portal gives your clients a secure, branded view of their invoices, documents, and project status — without requiring them to create an account.

### Authentication Flow

```
Owner clicks "Invite to Portal" on contact
        ↓
MenteIQ generates single-use token (1-hour TTL)
        ↓
Resend sends branded magic link email
        ↓
Client clicks link → token verified → session cookie set
        ↓
Client accesses portal (their data only)
        ↓
Token marked as used (cannot be reused)
```

### Portal Features

- View all invoices (with PDF download)
- View shared documents
- View project status and milestones
- Mobile-responsive design
- Auto-logout on session expiry

---

## 📊 Project Management

### Views

| View | Description |
|---|---|
| **Kanban** | Drag-and-drop task board by status |
| **Timeline** | Gantt-style timeline with milestones |
| **List** | Sortable/filterable table view |

### Task System

- Priority levels: Low / Medium / High / Urgent
- Status: Todo → In Progress → Review → Done
- Assignees, due dates, estimated hours
- Dependencies (blocks / blocked-by relationships)
- Time entries per task
- Comments and attachments

### Budget Tracking

```
Project budget set → Time entries logged at hourly rate →
Expenses added → Budget dashboard shows planned vs. actual →
Alerts at 80% / 100% threshold
```

---

## 📦 Vertical Packs

Add-on modules that unlock industry-specific workflows on top of the core platform:

| Pack | Price | Features |
|---|---|---|
| 🧑‍💼 **Consultant Pack** | +€15/mo | SOW/proposal templates, hourly rate tracking, AI-powered proposal generation |
| 🛡️ **Insurance Pack** | +€20/mo | Policy tracking, renewal alerts, commission calculator |
| 🧮 **Accounting Pack** | +€20/mo | Client document vault, tax calendar, document workflows |
| 🎨 **Agency Pack** | +€25/mo | Team capacity planning, retainer tracking, project profitability |

Packs are stored as `enabled_packs[]` on the `organizations` table and gated at the API and UI layer.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account
- (Optional) Stripe, OpenAI, Anthropic, Resend accounts

### 1. Clone the repository

```bash
git clone https://github.com/lordrichard6/menteiq_app.git
cd menteiq_app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)
```

### 4. Set up Supabase

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Environment Variables

```bash
# ─── Supabase (Required) ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-side admin ops only

# ─── App URL (Required) ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://app.menteiq.ch

# ─── AI Models (At least one required for AI features) ────────────
OPENAI_API_KEY=sk-...                     # GPT-4o, GPT-4 Turbo
ANTHROPIC_API_KEY=sk-ant-...              # Claude 3.5 Sonnet, Opus 4
GOOGLE_GENERATIVE_AI_API_KEY=AIza...      # Gemini 2.0 Flash, Pro

# ─── Payments (Required for invoice payment links) ────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Email (Required for portal invitations) ──────────────────────
RESEND_API_KEY=re_...
```

> ⚠️ **Never commit `.env.local` to version control.** It is gitignored by default.
> The `SUPABASE_SERVICE_ROLE_KEY` has full database access — treat it as a root password.

---

## 📁 Project Structure

```
menteiq_app/
├── public/                         # Static assets
│   ├── menteiq_logo.svg            # Primary logo (dark bg)
│   ├── menteiq_logo_white.svg      # White variant (dark bg)
│   └── favicon.ico
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth routes (login, signup)
│   │   ├── (admin)/                # Protected admin routes
│   │   │   ├── dashboard/
│   │   │   ├── contacts/
│   │   │   ├── contacts/[id]/
│   │   │   ├── projects/
│   │   │   ├── projects/[id]/
│   │   │   ├── tasks/
│   │   │   ├── invoices/
│   │   │   ├── documents/
│   │   │   ├── chat/
│   │   │   ├── crm/
│   │   │   └── settings/
│   │   ├── portal/                 # Client portal routes
│   │   │   ├── dashboard/
│   │   │   └── auth/[token]/
│   │   ├── api/                    # API routes
│   │   │   ├── chat/
│   │   │   ├── ai/
│   │   │   ├── documents/
│   │   │   ├── contacts/
│   │   │   ├── invoices/
│   │   │   ├── portal/
│   │   │   ├── gdpr/
│   │   │   ├── webhooks/
│   │   │   ├── notifications/
│   │   │   └── trpc/
│   │   ├── auth/callback/          # OAuth callback
│   │   ├── privacy/
│   │   └── terms/
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # Base UI (shadcn)
│   │   ├── layout/                 # Sidebar, header
│   │   ├── contacts/               # CRM components
│   │   ├── projects/               # Project components
│   │   ├── documents/              # Document components
│   │   ├── modules/
│   │   │   ├── ai/                 # AI omnibox
│   │   │   ├── directory/          # Zefix lookup
│   │   │   ├── invoicing/          # Invoice builder
│   │   │   └── vault/              # Document manager
│   │   ├── notifications/
│   │   └── time/                   # Time tracking
│   │
│   ├── lib/                        # Core utilities
│   │   ├── supabase/               # DB client (browser/server)
│   │   ├── trpc/                   # tRPC router
│   │   ├── ai/                     # RAG, embeddings, search
│   │   ├── invoices/               # PDF, Swiss QR, tax rates
│   │   ├── services/               # Stripe, calendar, Zefix
│   │   ├── email/                  # Resend templates
│   │   ├── portal/                 # Portal session logic
│   │   ├── validation/             # Zod schemas
│   │   ├── pricing/                # Subscription tiers
│   │   └── swiss/                  # Swiss-specific utils
│   │
│   ├── stores/                     # Zustand state stores
│   │   ├── chat-store.ts
│   │   ├── contact-store.ts
│   │   ├── project-store.ts
│   │   ├── task-store.ts
│   │   ├── invoice-store.ts
│   │   └── ...
│   │
│   └── types/                      # TypeScript types
│       ├── schema.ts               # DB schema types
│       └── ...
│
├── supabase/
│   ├── migrations/                 # 27 database migrations
│   ├── seed.sql                    # Development seed data
│   └── SCHEMA.md                   # Schema documentation
│
├── .env.example                    # Environment variable template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚢 Deployment

### Vercel (Production)

The app is deployed on Vercel with automatic deployments on every push to `main`.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

**Required Vercel environment variables** — set in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (sensitive) |
| `NEXT_PUBLIC_APP_URL` | Production, Preview, Development |
| `OPENAI_API_KEY` | Production, Preview |
| `ANTHROPIC_API_KEY` | Production, Preview |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Production, Preview |
| `STRIPE_SECRET_KEY` | Production, Preview |
| `STRIPE_WEBHOOK_SECRET` | Production |
| `RESEND_API_KEY` | Production, Preview |

### Database Migrations

```bash
# Push new migration to production
supabase db push

# Create a new migration
supabase migration new my_migration_name
```

### Custom Domain

Production: `app.menteiq.ch` → DNS A record → `76.76.21.21`

---

## 👤 About

<div align="center">

**MenteIQ** is designed, built, and maintained by **Lopes2tech**

*Building software that works for European professionals — with Swiss precision.*

[![Lopes2tech](https://img.shields.io/badge/Made_by-Lopes2tech-3D4A67)](https://lopes2tech.com)
[![Switzerland](https://img.shields.io/badge/Based_in-Switzerland_🇨🇭-E30613)](https://lopes2tech.com)

</div>

---

### Related Repositories

| Repo | Description | URL |
|---|---|---|
| `menteiq_app` | This repository — the application | [github.com/lordrichard6/menteiq_app](https://github.com/lordrichard6/menteiq_app) |
| `menteiq_website` | Marketing website (Next.js + i18n) | [github.com/lordrichard6/menteiq_website](https://github.com/lordrichard6/menteiq_website) |

---

### Pricing

| Plan | Price | Tokens/mo |
|---|---|---|
| Free | €0 | 1,000 (100/day cap) |
| Pro | €29 | 50,000 |
| Business | €79 | 200,000 |
| Enterprise | €199 | 500,000 |

---

### Support & Feedback

- 🐛 **Bug reports** — [GitHub Issues](https://github.com/lordrichard6/menteiq_app/issues)
- 📧 **Business enquiries** — [paulo@menteiq.ch](mailto:paulo@menteiq.ch)
- 🌐 **Website** — [menteiq.ch](https://menteiq.ch)

---

<div align="center">

© 2026 **Lopes2tech** · All rights reserved · MenteIQ is a product of Lopes2tech

*Data stored in Switzerland 🇨🇭 · GDPR Compliant · nDSG Compliant · Swiss-Made Software*

</div>
