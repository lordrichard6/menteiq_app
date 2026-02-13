# OrbitCRM Database Schema

## Overview

This document describes the database schema for OrbitCRM, organized by implementation phase.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│  organizations  │     │    profiles     │
│  (Tenants)      │────<│  (Users)        │
│                 │     │                 │
│ subscription    │     │ role: owner/    │
│ token_balance   │     │       member    │
│ enabled_packs   │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┴───────────────────┐
         │    │                                      │
         ▼    ▼                                      ▼
┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
│    contacts     │     │    projects     │   │ ai_conversations│
│                 │     │                 │   │                 │
│ status: lead/   │     │ status: active/ │   │ model           │
│ opportunity/    │────<│ completed       │   │ user_id         │
│ client/churned  │     │                 │   │                 │
└────────┬────────┘     └────────┬────────┘   └────────┬────────┘
         │                       │                     │
    ┌────┴────┐             ┌────┴────┐               │
    ▼         ▼             ▼         ▼               ▼
┌────────┐ ┌────────┐  ┌────────┐ ┌────────┐   ┌────────────┐
│invoices│ │ tasks  │  │  docs  │ │bookings│   │ai_messages │
└────────┘ └────────┘  └───┬────┘ └────────┘   └────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │doc_chunks   │
                    │(RAG vectors)│
                    └─────────────┘
```

## Phase 1: Core AI CRM (MVP)

### organizations
Multi-tenancy root table with subscription data.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Organization name |
| slug | text | URL-friendly identifier |
| settings | jsonb | Configuration (branding, etc.) |
| subscription_tier | text | 'free', 'pro', 'business' |
| stripe_customer_id | text | Stripe customer ID |
| stripe_subscription_id | text | Stripe subscription ID |
| token_balance | integer | Monthly token allocation remaining |
| token_pack_balance | integer | Purchased tokens remaining |
| enabled_packs | text[] | Active vertical packs |
| current_period_start | timestamptz | Billing period start |
| current_period_end | timestamptz | Billing period end |
| created_at | timestamptz | Creation timestamp |

### profiles
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | References auth.users(id) |
| tenant_id | uuid | References organizations(id) |
| role | user_role | 'owner' or 'member' |
| full_name | text | Display name |
| email | text | Email address |
| avatar_url | text | Profile image URL |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### contacts
Hybrid Party Model (Person or Organization).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| is_company | boolean | true = org, false = person |
| company_uid | text | Zefix/NIF/VIES identifier |
| company_name | text | Company name |
| first_name | text | Person first name |
| last_name | text | Person last name |
| email | text | Contact email |
| phone | text | Contact phone |
| address_* | text | Address fields |
| status | contact_status | lead/opportunity/client/churned |
| tags | text[] | Tags for filtering |
| notes | text | Free-form notes |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### invoices
Invoice data with Swiss QR-Bill support.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| project_id | uuid | References projects(id) |
| contact_id | uuid | References contacts(id) |
| invoice_number | text | Sequential invoice number |
| currency | text | CHF, EUR, etc. |
| amount_total | numeric | Total amount |
| status | invoice_status | draft/sent/paid/overdue/cancelled |
| due_date | date | Payment due date |
| paid_at | timestamptz | When payment was received |
| qr_reference | text | Swiss QR-Bill reference |
| iban_used | text | Bank account IBAN |
| created_at | timestamptz | Creation timestamp |

### ai_conversations
AI chat conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| user_id | uuid | References profiles(id) |
| contact_id | uuid | Optional context contact |
| project_id | uuid | Optional context project |
| title | text | Conversation title |
| model | text | AI model used |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last message timestamp |

### ai_messages
Messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversation_id | uuid | References ai_conversations(id) |
| role | text | 'user', 'assistant', 'system' |
| content | text | Message content |
| tokens_in | integer | Input tokens used |
| tokens_out | integer | Output tokens used |
| created_at | timestamptz | Message timestamp |

### usage_logs
Token usage tracking for billing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| user_id | uuid | References profiles(id) |
| model | text | AI model used |
| tokens_in | integer | Input tokens |
| tokens_out | integer | Output tokens |
| multiplier | numeric | Model cost multiplier |
| effective_tokens | integer | tokens * multiplier |
| conversation_id | uuid | References ai_conversations(id) |
| created_at | timestamptz | Usage timestamp |

## Phase 2: Knowledge + Tasks

### documents
Uploaded documents with RAG metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| project_id | uuid | References projects(id) |
| contact_id | uuid | References contacts(id) |
| name | text | File name |
| file_path | text | Storage path |
| file_type | text | MIME type |
| size_bytes | bigint | File size |
| visibility | doc_visibility | 'internal' or 'shared' |
| embedding_status | text | pending/processing/complete/error |
| content_summary | text | AI-generated summary |
| created_at | timestamptz | Upload timestamp |

### document_chunks
RAG vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| document_id | uuid | References documents(id) |
| chunk_index | integer | Order within document |
| content | text | Chunk text content |
| embedding | vector(1536) | OpenAI embedding |
| created_at | timestamptz | Processing timestamp |

### tasks
Task management.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| contact_id | uuid | References contacts(id) |
| project_id | uuid | References projects(id) |
| title | text | Task title |
| description | text | Task description |
| status | task_status | todo/in_progress/done |
| priority | task_priority | low/medium/high/urgent |
| due_date | date | Due date |
| created_by | uuid | References profiles(id) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

## Phase 3: Projects

### projects
Project management.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| contact_id | uuid | References contacts(id) |
| name | text | Project name |
| description | text | Project description |
| status | project_status | lead/active/on_hold/completed/archived |
| deadline | timestamptz | Project deadline |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### bookings (Deferred)
External calendar sync.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | References organizations(id) |
| project_id | uuid | References projects(id) |
| contact_id | uuid | References contacts(id) |
| external_event_id | text | Google/Outlook event ID |
| start_time | timestamptz | Event start |
| end_time | timestamptz | Event end |
| title | text | Event title |
| location | text | Event location |
| status | text | confirmed/cancelled/etc. |
| created_at | timestamptz | Sync timestamp |

## Enums

```sql
-- User roles (simplified for MVP)
CREATE TYPE user_role AS ENUM ('owner', 'member');

-- Contact pipeline stages
CREATE TYPE contact_status AS ENUM ('lead', 'opportunity', 'client', 'churned');

-- Project status
CREATE TYPE project_status AS ENUM ('lead', 'active', 'on_hold', 'completed', 'archived');

-- Invoice status
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Task status
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- Task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Document visibility
CREATE TYPE doc_visibility AS ENUM ('internal', 'shared');
```

## Row Level Security (RLS)

All tables have RLS enabled with organization-level isolation:
- Users can only access data within their organization
- Owners can see all org data
- Members can see their own data + shared org data

## Indexes

Key indexes for performance:
- `contacts_tenant_id_idx` - Filter contacts by org
- `contacts_status_idx` - Filter by pipeline stage
- `tasks_due_date_idx` - Sort/filter by due date
- `document_chunks_embedding_idx` - Vector similarity search
- `usage_logs_created_at_idx` - Usage reporting queries
