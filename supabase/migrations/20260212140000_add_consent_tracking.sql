/*
  # GDPR Consent Tracking Migration
  # Migration: 20260212140000_add_consent_tracking.sql

  Adds consent management fields to contacts table for GDPR compliance.
  Tracks marketing consent, data processing consent, and consent history.
*/

-- =====================================================
-- 1. ADD CONSENT FIELDS TO CONTACTS TABLE
-- =====================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_processing_consent boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip_address text,
  ADD COLUMN IF NOT EXISTS consent_user_agent text,
  ADD COLUMN IF NOT EXISTS privacy_policy_version text;

-- =====================================================
-- 2. CREATE CONSENT HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- Consent details
  consent_type text NOT NULL, -- 'marketing', 'data_processing', 'both'
  consent_given boolean NOT NULL,
  consent_date timestamptz NOT NULL DEFAULT now(),

  -- Metadata for audit trail
  ip_address text,
  user_agent text,
  privacy_policy_version text,
  notes text,

  -- Who recorded this consent
  recorded_by uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS consent_history_contact_id_idx ON consent_history(contact_id);
CREATE INDEX IF NOT EXISTS consent_history_tenant_id_idx ON consent_history(tenant_id);
CREATE INDEX IF NOT EXISTS consent_history_created_at_idx ON consent_history(created_at DESC);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Users can view consent history for their organization's contacts
CREATE POLICY "Users view consent history" ON consent_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Users can insert consent history
CREATE POLICY "Users create consent history" ON consent_history
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to record consent change
CREATE OR REPLACE FUNCTION record_consent_change(
  p_contact_id uuid,
  p_consent_type text,
  p_consent_given boolean,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_privacy_policy_version text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
  v_history_id uuid;
BEGIN
  -- Get tenant_id from contact
  SELECT tenant_id INTO v_tenant_id
  FROM contacts
  WHERE id = p_contact_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- Insert consent history record
  INSERT INTO consent_history (
    tenant_id,
    contact_id,
    consent_type,
    consent_given,
    ip_address,
    user_agent,
    privacy_policy_version,
    notes,
    recorded_by
  ) VALUES (
    v_tenant_id,
    p_contact_id,
    p_consent_type,
    p_consent_given,
    p_ip_address,
    p_user_agent,
    p_privacy_policy_version,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_history_id;

  -- Update contact's current consent status
  IF p_consent_type = 'marketing' THEN
    UPDATE contacts
    SET marketing_consent = p_consent_given,
        consent_date = now(),
        consent_ip_address = p_ip_address,
        consent_user_agent = p_user_agent,
        privacy_policy_version = p_privacy_policy_version
    WHERE id = p_contact_id;
  ELSIF p_consent_type = 'data_processing' THEN
    UPDATE contacts
    SET data_processing_consent = p_consent_given,
        consent_date = now(),
        consent_ip_address = p_ip_address,
        consent_user_agent = p_user_agent,
        privacy_policy_version = p_privacy_policy_version
    WHERE id = p_contact_id;
  ELSIF p_consent_type = 'both' THEN
    UPDATE contacts
    SET marketing_consent = p_consent_given,
        data_processing_consent = p_consent_given,
        consent_date = now(),
        consent_ip_address = p_ip_address,
        consent_user_agent = p_user_agent,
        privacy_policy_version = p_privacy_policy_version
    WHERE id = p_contact_id;
  END IF;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON COLUMN contacts.marketing_consent IS 'GDPR: User consent for marketing communications';
COMMENT ON COLUMN contacts.data_processing_consent IS 'GDPR: User consent for data processing';
COMMENT ON COLUMN contacts.consent_date IS 'When consent was last updated';
COMMENT ON COLUMN contacts.consent_ip_address IS 'IP address when consent was given (for audit)';
COMMENT ON COLUMN contacts.consent_user_agent IS 'User agent when consent was given (for audit)';
COMMENT ON COLUMN contacts.privacy_policy_version IS 'Version of privacy policy user consented to';

COMMENT ON TABLE consent_history IS 'Audit trail of all consent changes for GDPR compliance';
COMMENT ON FUNCTION record_consent_change IS 'Records a consent change and updates contact record';

/*
  Consent Types:
  - 'marketing': Consent for marketing emails, newsletters, promotional content
  - 'data_processing': Consent for basic data processing (usually required for service)
  - 'both': Update both consent types at once
*/
