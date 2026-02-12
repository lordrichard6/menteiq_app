/*
  # Client Portal Access - Database Schema
  # Migration: 20260212120000_add_portal_to_contacts.sql

  Adds client portal functionality to contacts table:
  1. Portal access toggle (enabled/disabled)
  2. Secure token for magic link authentication
  3. Portal activity tracking (invitations, logins)
  4. Portal sessions table for auth management
*/

-- =====================================================
-- 1. ADD PORTAL FIELDS TO CONTACTS
-- =====================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_portal_login timestamptz;

-- Create index for fast portal token lookups
CREATE INDEX IF NOT EXISTS contacts_portal_token_idx ON contacts(portal_token)
  WHERE portal_token IS NOT NULL;

-- =====================================================
-- 2. PORTAL SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS portal_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,

  -- Session metadata
  ip_address inet,
  user_agent text,

  -- Token expiration (magic links expire after 1 hour by default)
  expires_at timestamptz NOT NULL,
  used_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS portal_sessions_token_idx ON portal_sessions(token);
CREATE INDEX IF NOT EXISTS portal_sessions_contact_id_idx ON portal_sessions(contact_id);
CREATE INDEX IF NOT EXISTS portal_sessions_expires_at_idx ON portal_sessions(expires_at);

-- =====================================================
-- 3. RLS POLICIES FOR PORTAL SESSIONS
-- =====================================================

-- Admin users can view all portal sessions for their organization's contacts
CREATE POLICY "Admins view portal sessions in their org" ON portal_sessions
  FOR SELECT USING (
    contact_id IN (
      SELECT id FROM contacts WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Allow insert for session creation (used by API routes)
CREATE POLICY "Allow session creation" ON portal_sessions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to generate secure random token for portal access
CREATE OR REPLACE FUNCTION generate_portal_token()
RETURNS text AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate random 32-character hex string
    new_token := encode(gen_random_bytes(16), 'hex');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM contacts WHERE portal_token = new_token) INTO token_exists;

    -- Exit loop if unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate magic link session token (different from portal_token)
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS text AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate random 48-character hex string (longer for sessions)
    new_token := encode(gen_random_bytes(24), 'hex');

    -- Check if token already exists in portal_sessions
    SELECT EXISTS(SELECT 1 FROM portal_sessions WHERE token = new_token) INTO token_exists;

    -- Exit loop if unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify portal session token
CREATE OR REPLACE FUNCTION verify_portal_session(session_token text)
RETURNS TABLE(
  contact_id uuid,
  contact_email text,
  contact_name text,
  tenant_id uuid,
  is_valid boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS contact_id,
    c.email AS contact_email,
    c.name AS contact_name,
    c.tenant_id,
    (ps.expires_at > now() AND ps.used_at IS NULL) AS is_valid
  FROM portal_sessions ps
  JOIN contacts c ON c.id = ps.contact_id
  WHERE ps.token = session_token
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired portal sessions (run via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_portal_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM portal_sessions
    WHERE expires_at < now() - interval '7 days'
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN contacts.portal_enabled IS 'Whether client portal access is enabled for this contact';
COMMENT ON COLUMN contacts.portal_token IS 'Persistent token for portal access (used in portal URL)';
COMMENT ON COLUMN contacts.portal_invited_at IS 'When the portal invitation was last sent';
COMMENT ON COLUMN contacts.last_portal_login IS 'Last time the contact logged into their portal';

COMMENT ON TABLE portal_sessions IS 'Magic link sessions for client portal authentication';
COMMENT ON COLUMN portal_sessions.token IS 'One-time use magic link token (expires after 1 hour)';
COMMENT ON COLUMN portal_sessions.expires_at IS 'When this magic link expires';
COMMENT ON COLUMN portal_sessions.used_at IS 'When this magic link was used (null if unused)';

/*
  Portal Authentication Flow:

  1. Admin enables portal for a contact
  2. System generates unique portal_token (persistent identifier)
  3. Admin sends invitation → creates portal_session with magic link token
  4. Client clicks magic link → verifies session token
  5. If valid and not expired → mark used_at, update last_portal_login, create session cookie
  6. Client accesses portal with session cookie
  7. Session tokens expire after 1 hour (security)
  8. portal_token stays the same (used for future magic links)

  Security Notes:
  - portal_token: Persistent, identifies the contact (32 chars)
  - session token: One-time use, expires 1 hour (48 chars)
  - Magic links can only be used once (used_at prevents replay)
  - Old sessions cleaned up after 7 days
*/
