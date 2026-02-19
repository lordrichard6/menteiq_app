/*
  # Orbit Business OS - Unified Domain Model
  # Migration: 20240101000000_init_unified_schema.sql
  
  1. Extensions
     - vector (AI embeddings)
     - uuid-ossp (UUID generation)
  
  2. Core Entities
     - tenants (Multi-tenancy root)
     - profiles (User profiles linked to auth.users)
     - contacts (Hybrid Party Model: Person/Organization)
     - projects (Work containers)
  
  3. Action Entities
     - documents (With strict visibility scope)
     - bookings (External sync placeholders)
     - tasks (Work items)
     - invoices (QR-Bill data)

  4. Security (RLS)
     - Strict tenant isolation
     - Role-based visibility (Admin vs Client)
*/

-- 1. EXTENSIONS
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- 2. CORE ENTITIES

-- TENANTS (The Service Provider, e.g., "Ribeiro Consulting")
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  settings jsonb default '{}'::jsonb, -- Branding, specific config
  created_at timestamptz default now()
);

-- PROFILES (Users linked to auth.users)
-- Valid Roles: 'admin' (Consultant), 'client' (End User)
create type user_role as enum ('admin', 'client');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id),
  role user_role not null default 'client',
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONTACTS (The "Hybrid Party Model")
-- Can be human OR organization. 
-- Centralized generic 'company_uid' for Zefix/NIF.
create table contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  
  is_company boolean default false,
  company_uid text, -- Zefix UID (CH), NIF (PT), VIES (EU)
  company_name text, -- If is_company=true OR if person belongs to company
  
  first_name text, -- If is_company=false
  last_name text,  -- If is_company=false
  email text,
  phone text,
  
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text default 'CH', -- ISO code
  
  tags text[],
  notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROJECTS (The Work Container)
create type project_status as enum ('lead', 'active', 'on_hold', 'completed', 'archived');

create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  contact_id uuid references contacts(id) on delete cascade,
  
  name text not null,
  description text,
  status project_status default 'lead',
  deadline timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ACTION ENTITIES

-- DOCUMENTS (The Intelligence Vault)
create type doc_visibility as enum ('internal', 'shared');

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  project_id uuid references projects(id),
  contact_id uuid references contacts(id),
  
  name text not null,
  file_path text not null, -- Storage path
  file_type text,
  size_bytes bigint,
  
  visibility doc_visibility not null default 'internal',
  
  -- AI Embeddings
  embedding vector(1536), -- For RAG
  content_summary text,   -- AI generated summary
  
  created_at timestamptz default now()
);

-- BOOKINGS (Sync Placeholder)
create table bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  project_id uuid references projects(id),
  contact_id uuid references contacts(id),
  
  external_event_id text, -- ID from Google/Outlook
  start_time timestamptz not null,
  end_time timestamptz not null,
  title text not null,
  location text,
  
  status text default 'confirmed',
  
  created_at timestamptz default now()
);

-- INVOICES (QR-Bill Ready)
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  project_id uuid references projects(id),
  contact_id uuid references contacts(id),
  
  invoice_number text not null, -- Sequential ID
  currency text default 'CHF',
  amount_total numeric(10, 2) not null,
  status invoice_status default 'draft',
  
  due_date date,
  paid_at timestamptz,
  
  -- QR-Bill / Payment Data
  qr_reference text,
  iban_used text,
  
  created_at timestamptz default now()
);

-- 4. ROW LEVEL SECURITY (RLS)

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table projects enable row level security;
alter table documents enable row level security;
alter table bookings enable row level security;
alter table invoices enable row level security;

-- POLICIES

-- Helper function to get current user's profile
create or replace function get_current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid() limit 1;
$$ language sql security definer;

create or replace function get_current_tenant_id()
returns uuid as $$
  select tenant_id from profiles where id = auth.uid() limit 1;
$$ language sql security definer;


-- ADMIN POLICIES (Full Access to own Tenant)
-- "Admins can view everything in their tenant"

-- PROFILE
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

-- CONTACTS
create policy "Admins view all contacts in tenant" on contacts
  for all using (
    auth.uid() in (select id from profiles where role = 'admin' and tenant_id = contacts.tenant_id)
  );
  
-- PROJECTS
create policy "Admins view all projects in tenant" on projects
  for all using (
    auth.uid() in (select id from profiles where role = 'admin' and tenant_id = projects.tenant_id)
  );

-- DOCUMENTS (Strict RLS for RAG/Visibility)
-- Admins see ALL documents in tenant
create policy "Admins view all docs" on documents
  for all using (
    auth.uid() in (select id from profiles where role = 'admin' and tenant_id = documents.tenant_id)
  );
  
-- Clients see ONLY 'shared' documents linked to their Contact ID
create policy "Clients view shared docs" on documents
  for select using (
    visibility = 'shared' 
    and contact_id in (select id from contacts where email = (select email from auth.users where id = auth.uid()))
  );

-- BOOKINGS
-- Admins see all
create policy "Admins view bookings" on bookings
  for all using (
    auth.uid() in (select id from profiles where role = 'admin' and tenant_id = bookings.tenant_id)
  );

-- Clients see own bookings
create policy "Clients view own bookings" on bookings
  for select using (
    contact_id in (select id from contacts where email = (select email from auth.users where id = auth.uid()))
  );

-- INVOICES
-- Admins see all
create policy "Admins view invoices" on invoices
  for all using (
    auth.uid() in (select id from profiles where role = 'admin' and tenant_id = invoices.tenant_id)
  );
  
-- Clients see own

-- 5. TRIGGERS

-- Auto-create profile on new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'client' -- Default role is client, Admin must elevate manually or via invite
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

