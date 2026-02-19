/*
  # Invoice Line Items & Extended Invoice Fields
  # Migration: 20260206100000_invoice_line_items.sql
  
  Adds:
  1. invoice_line_items table for detailed line items
  2. Extended invoice fields (subtotal, tax_total, notes, stripe fields, invoice_type)
  3. RLS policies for invoice_line_items
  4. Helper function to get current tenant
*/

-- =====================================================
-- 1. EXTEND INVOICES TABLE
-- =====================================================

-- Add new columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS subtotal numeric(10,2),
  ADD COLUMN IF NOT EXISTS tax_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS invoice_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS stripe_payment_link text,
  ADD COLUMN IF NOT EXISTS stripe_payment_id text,
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'swiss_qr';

-- Add constraint for valid invoice types
ALTER TABLE invoices 
  ADD CONSTRAINT valid_invoice_type 
  CHECK (invoice_type IN ('swiss_qr', 'eu_sepa'));

-- =====================================================
-- 2. CREATE INVOICE LINE ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0,  -- e.g., 8.1 for Swiss VAT, 19 for DE
  tax_amount numeric(10,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price * tax_rate / 100, 2)) STORED,
  line_total numeric(10,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient lookups by invoice
CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_id_idx ON invoice_line_items(invoice_id);

-- =====================================================
-- 3. ENABLE RLS ON INVOICE LINE ITEMS
-- =====================================================

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy: Users can only access line items for invoices in their organization
CREATE POLICY "Users access own org invoice line items" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

-- =====================================================
-- 4. UPDATE INVOICE POLICIES (ensure owners have full access)
-- =====================================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Owners view invoices" ON invoices;

-- Recreate with USING and WITH CHECK for full CRUD access
CREATE POLICY "Owners manage invoices" ON invoices
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoice_line_items IS 'Individual line items for invoices with quantity, price, and tax calculation';
COMMENT ON COLUMN invoice_line_items.tax_rate IS 'Tax rate as percentage (e.g., 8.1 for 8.1% Swiss VAT)';
COMMENT ON COLUMN invoice_line_items.tax_amount IS 'Calculated tax amount (quantity * unit_price * tax_rate / 100)';
COMMENT ON COLUMN invoice_line_items.line_total IS 'Line total before tax (quantity * unit_price)';
COMMENT ON COLUMN invoices.invoice_type IS 'Invoice format: swiss_qr for Swiss QR-Bill, eu_sepa for EU SEPA invoice';
COMMENT ON COLUMN invoices.stripe_payment_link IS 'Stripe Payment Link URL for online payment';
COMMENT ON COLUMN invoices.stripe_payment_id IS 'Stripe payment/session ID after successful payment';
