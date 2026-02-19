/*
  # OrbitCRM MVP Schema Update
  # Migration: 20260206000000_mvp_simplified_schema.sql
  
  Updates the initial schema for MVP launch with:
  1. Simplified role system (owner/member)
  2. Subscription & billing fields
  3. Contact pipeline status
  4. Tasks table
  5. AI conversations & messages
  6. Document chunks for RAG
  7. Usage tracking
  
  MVP Scope:
  - Phase 1: Auth, Contacts, Invoicing, AI Chat
  - Phase 2: RAG, Tasks, AI Actions
  - Phase 3: Projects, Team Features
*/

-- =====================================================
-- 1. UPDATE TENANTS -> ORGANIZATIONS (Naming clarity)
-- =====================================================

-- Rename table for clarity (tenants -> organizations)
ALTER TABLE tenants RENAME TO organizations;

-- Add subscription & billing fields
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS token_balance integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS token_pack_balance integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enabled_packs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Add constraint for valid subscription tiers
ALTER TABLE organizations 
  ADD CONSTRAINT valid_subscription_tier 
  CHECK (subscription_tier IN ('free', 'pro', 'business'));

-- =====================================================
-- 2. UPDATE PROFILES (Simplified roles)
-- =====================================================

-- The original schema uses user_role enum ('admin', 'client')
-- We need to convert to ('owner', 'member')

-- Step 1: Drop all policies that depend on the role column
DROP POLICY IF EXISTS "Admins view all contacts in tenant" ON contacts;
DROP POLICY IF EXISTS "Admins view all projects in tenant" ON projects;
DROP POLICY IF EXISTS "Admins view all docs" ON documents;
DROP POLICY IF EXISTS "Admins view bookings" ON bookings;
DROP POLICY IF EXISTS "Admins view invoices" ON invoices;

-- Step 2: Drop the helper function that uses the enum
DROP FUNCTION IF EXISTS get_current_user_role();

-- Step 3: Drop the trigger that uses the role column
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 4: Add a temporary text column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_new text;

-- Step 5: Copy existing role values (map admin->owner, client->member)
UPDATE profiles SET role_new = CASE 
  WHEN role::text = 'admin' THEN 'owner'
  WHEN role::text = 'client' THEN 'member'
  ELSE 'member'
END;

-- Step 6: Drop the old column
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Step 7: Drop the old enum type
DROP TYPE IF EXISTS user_role;

-- Step 8: Create new enum with simplified values
CREATE TYPE user_role AS ENUM ('owner', 'member');

-- Step 9: Add the role column back with new type
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'member';

-- Step 10: Copy values from temporary column
UPDATE profiles SET role = role_new::user_role WHERE role_new IS NOT NULL;

-- Step 11: Drop temporary column
ALTER TABLE profiles DROP COLUMN IF EXISTS role_new;

-- Step 12: Recreate helper function with new role type
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 13: Recreate policies with 'owner' instead of 'admin'
CREATE POLICY "Owners view all contacts in org" ON contacts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = contacts.tenant_id)
  );

CREATE POLICY "Owners view all projects in org" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = projects.tenant_id)
  );

CREATE POLICY "Owners view all docs" ON documents
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = documents.tenant_id)
  );

CREATE POLICY "Owners view bookings" ON bookings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = bookings.tenant_id)
  );

CREATE POLICY "Owners view invoices" ON invoices
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = invoices.tenant_id)
  );

-- Step 14: Recreate trigger for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'member'  -- Default role is member, Owner must elevate manually or via invite
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- 3. UPDATE CONTACTS (Add pipeline status)
-- =====================================================

-- Add contact status for pipeline
CREATE TYPE contact_status AS ENUM ('lead', 'opportunity', 'client', 'churned');

ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS status contact_status DEFAULT 'lead';

-- Update foreign key to reference organizations (renamed from tenants)
ALTER TABLE contacts 
  DROP CONSTRAINT IF EXISTS contacts_tenant_id_fkey,
  ADD CONSTRAINT contacts_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- Note: Keeping column name as tenant_id for consistency with existing RLS policies

-- =====================================================
-- 4. TASKS TABLE (Phase 2)
-- =====================================================

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations(id) NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  
  title text NOT NULL,
  description text,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  due_date date,
  
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. AI CONVERSATIONS & MESSAGES (Phase 1)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  
  title text, -- Auto-generated from first message
  model text NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  
  role text NOT NULL, -- 'user' | 'assistant' | 'system'
  content text NOT NULL,
  
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. DOCUMENT CHUNKS (RAG - Phase 2)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  
  created_at timestamptz DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
  ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Add embedding status to documents
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'pending';

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. USAGE TRACKING (Phase 1 - Required for billing)
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  
  model text NOT NULL,
  tokens_in integer NOT NULL,
  tokens_out integer NOT NULL,
  multiplier numeric(3, 1) DEFAULT 1.0,
  effective_tokens integer NOT NULL, -- tokens * multiplier
  
  conversation_id uuid REFERENCES ai_conversations(id),
  
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. UPDATE FOREIGN KEYS (Point to organizations table)
-- =====================================================

-- Note: Keeping column name as tenant_id for consistency with RLS policies
-- Only updating FK constraints to reference organizations (renamed from tenants)

-- Projects
ALTER TABLE projects 
  DROP CONSTRAINT IF EXISTS projects_tenant_id_fkey,
  ADD CONSTRAINT projects_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- Documents
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_tenant_id_fkey,
  ADD CONSTRAINT documents_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- Bookings
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS bookings_tenant_id_fkey,
  ADD CONSTRAINT bookings_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- Invoices
ALTER TABLE invoices 
  DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey,
  ADD CONSTRAINT invoices_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- Profiles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey,
  ADD CONSTRAINT profiles_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES organizations(id);

-- =====================================================
-- 9. UPDATED HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Note: The original get_current_tenant_id() function from init migration still works
-- But let's recreate it to point to the renamed organizations table
DROP FUNCTION IF EXISTS get_current_tenant_id();
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- TASKS
CREATE POLICY "Users view tasks in their org" ON tasks
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
  );

-- AI CONVERSATIONS
CREATE POLICY "Users view their own conversations" ON ai_conversations
  FOR ALL USING (
    user_id = auth.uid() OR tenant_id = get_current_tenant_id()
  );

-- AI MESSAGES
CREATE POLICY "Users view messages in their conversations" ON ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid() OR tenant_id = get_current_tenant_id()
    )
  );

-- DOCUMENT CHUNKS
CREATE POLICY "Users view chunks for their docs" ON document_chunks
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id = get_current_tenant_id()
    )
  );

-- USAGE LOGS
CREATE POLICY "Users view their own usage" ON usage_logs
  FOR SELECT USING (
    user_id = auth.uid() OR tenant_id = get_current_tenant_id()
  );

-- Owners can view all org usage
CREATE POLICY "Owners view all org usage" ON usage_logs
  FOR SELECT USING (
    tenant_id = get_current_tenant_id() 
    AND get_current_user_role() = 'owner'
  );

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 12. INDEXES FOR PERFORMANCE
-- =====================================================

-- Contacts
CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts(status);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);

-- Tasks
CREATE INDEX IF NOT EXISTS tasks_tenant_id_idx ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_contact_id_idx ON tasks(contact_id);

-- AI Conversations
CREATE INDEX IF NOT EXISTS ai_conversations_tenant_id_idx ON ai_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);

-- AI Messages
CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);

-- Usage Logs
CREATE INDEX IF NOT EXISTS usage_logs_tenant_id_idx ON usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs(created_at);

-- Invoices
CREATE INDEX IF NOT EXISTS invoices_tenant_id_idx ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_contact_id_idx ON invoices(contact_id);

-- Documents
CREATE INDEX IF NOT EXISTS documents_tenant_id_idx ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS documents_embedding_status_idx ON documents(embedding_status);

/*
  MVP Schema Summary:
  
  Phase 1 (Weeks 1-6):
  - organizations (subscription, billing)
  - profiles (auth, roles)
  - contacts (pipeline)
  - invoices (Swiss QR, EU IBAN)
  - ai_conversations + ai_messages
  - usage_logs
  
  Phase 2 (Weeks 7-10):
  - documents + document_chunks (RAG)
  - tasks
  
  Phase 3 (Weeks 11-16):
  - projects (already exists)
  - team invitations (future migration)
  - vertical pack tables (future migrations)
*/
