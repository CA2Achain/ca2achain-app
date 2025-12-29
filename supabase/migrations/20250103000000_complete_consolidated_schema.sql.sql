-- Migration: Complete CA2AChain Schema with Payments & CCPA Compliance
-- Date: 2025-12-29
-- Description: Complete database schema with immutable customer reference payments

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- UUID v7 FUNCTION FOR CHRONOLOGICAL ORDERING
-- =============================================

-- Custom UUIDv7 function for PostgreSQL (chronological ordering)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
  unix_ts_ms BIGINT;
  rand_a BYTEA;
  rand_b BYTEA;
  uuid_hex TEXT;
BEGIN
  -- Get current Unix timestamp in milliseconds (48 bits)
  unix_ts_ms := FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000);
  
  -- Generate random bytes
  rand_a := gen_random_bytes(2);  -- 12 random bits + 4 version bits
  rand_b := gen_random_bytes(8);  -- 2 variant bits + 62 random bits
  
  -- Construct UUIDv7 as hex string
  uuid_hex := CONCAT(
    lpad(to_hex(unix_ts_ms), 12, '0'),                    -- 48-bit timestamp
    lpad(to_hex(get_byte(rand_a, 0) & 15 | 112), 2, '0'), -- 4-bit version (7) + 4 random bits  
    lpad(to_hex(get_byte(rand_a, 1)), 2, '0'),            -- 8 random bits
    lpad(to_hex(get_byte(rand_b, 0) & 63 | 128), 2, '0'), -- 2-bit variant (10) + 6 random bits
    encode(substring(rand_b from 2 for 7), 'hex')         -- 56 random bits
  );
  
  -- Insert hyphens for proper UUID format and cast to UUID
  RETURN (
    substring(uuid_hex from 1 for 8) || '-' ||
    substring(uuid_hex from 9 for 4) || '-' ||
    substring(uuid_hex from 13 for 4) || '-' ||
    substring(uuid_hex from 17 for 4) || '-' ||
    substring(uuid_hex from 21 for 12)
  )::UUID;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTHENTICATION INTEGRATION
-- =============================================

-- We use Supabase's built-in auth.users table directly
-- No custom auth_accounts table needed

-- =============================================
-- BUYER ACCOUNTS TABLE
-- =============================================

-- Buyer accounts for individual customers seeking identity verification
CREATE TABLE buyer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic contact info
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Verification status
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired', 'rejected')),
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  
  -- Privado ID integration
  privado_did TEXT,
  privado_credential_id TEXT,
  
  -- One-time payment tracking
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(auth_id)
);

-- =============================================
-- DEALER ACCOUNTS TABLE
-- =============================================

-- Dealer accounts for firearm accessory businesses
CREATE TABLE dealer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business information
  company_name TEXT NOT NULL,
  business_address TEXT,
  business_phone TEXT,
  contact_name TEXT,
  federal_firearms_license TEXT, -- Optional for accessory-only dealers
  
  -- API authentication
  api_key_hash TEXT NOT NULL,
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stripe subscription billing
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  monthly_query_limit INTEGER DEFAULT 100,
  queries_used_this_month INTEGER DEFAULT 0,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(auth_id),
  UNIQUE(api_key_hash)
);

-- =============================================
-- BUYER SECRETS TABLE (ENCRYPTED PII VAULT)
-- =============================================

-- Encrypted storage for buyer PII (Persona verification data + Privado credentials)
CREATE TABLE buyer_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  buyer_id UUID REFERENCES buyer_accounts(id) ON DELETE CASCADE,
  
  -- Encrypted Persona PII (driver's license data, photos)
  encrypted_persona_data JSONB NOT NULL,
  
  -- Encrypted Privado ID verifiable credential
  encrypted_privado_credential TEXT NOT NULL,
  
  -- Encryption metadata
  encryption_key_id UUID NOT NULL,
  persona_verification_session TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(buyer_id)
);

-- =============================================
-- COMPLIANCE EVENTS TABLE
-- =============================================

-- Compliance events table using UUIDv7 for chronological ordering
CREATE TABLE compliance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- UUIDv7 for timeline ordering
  
  -- Verification participants (CCPA compliant - SET NULL on deletion)
  buyer_id UUID REFERENCES buyer_accounts(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES dealer_accounts(id) ON DELETE SET NULL,
  
  -- Immutable customer references (never deleted, for legal continuity)
  buyer_reference_id TEXT, -- 'BUY_a8b9c2d1' - survives account deletion
  dealer_reference_id TEXT, -- 'DLR_f3e4d5c6' - survives account deletion
  
  -- Verification details
  verification_id TEXT UNIQUE NOT NULL, -- Business-friendly ID: VER_2024_001234
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'approved', 'denied', 'expired')),
  verification_response JSONB, -- Structured verification results
  
  -- Legal compliance
  buyer_consent_given BOOLEAN DEFAULT false,
  buyer_consent_timestamp TIMESTAMPTZ,
  dealer_business_purpose TEXT,
  
  -- AB 1263 compliance fields
  transaction_purpose TEXT CHECK (transaction_purpose IN ('firearm_accessory_sale', 'age_verification', 'compliance_audit')),
  firearm_accessory_category TEXT,
  
  -- Blockchain proof integration
  blockchain_transaction_hash TEXT,
  zero_knowledge_proof_hash TEXT,
  
  -- Account deletion tracking (CCPA support)
  buyer_deleted BOOLEAN DEFAULT false,
  buyer_deleted_at TIMESTAMPTZ,
  dealer_deleted BOOLEAN DEFAULT false,
  dealer_deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE WITH IMMUTABLE CUSTOMER REFERENCE
-- =============================================

-- Payments table with your core columns + immutable customer reference for CCPA compliance
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  
  -- Your chosen core columns
  account_id UUID, -- Foreign key, SET NULL on CCPA deletion
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('verification', 'subscription')),
  amount_cents INTEGER NOT NULL,
  payment_timestamp TIMESTAMPTZ NOT NULL,
  
  -- Immutable customer reference (never deleted, for accounting continuity)
  customer_reference_id TEXT NOT NULL, -- 'BUY_a8b9c2d1' or 'DLR_f3e4d5c6'
  
  -- Essential for business operations
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MINIMAL ESSENTIAL INDEXES
-- =============================================

-- Buyer accounts - essential for user lookups
CREATE INDEX idx_buyer_accounts_auth_id ON buyer_accounts(auth_id);

-- Dealer accounts - essential for user lookups and API auth
CREATE INDEX idx_dealer_accounts_auth_id ON dealer_accounts(auth_id);
CREATE INDEX idx_dealer_accounts_api_key ON dealer_accounts(api_key_hash);

-- Buyer secrets - essential for PII lookup (scales 1:1 with buyers)
CREATE INDEX idx_buyer_secrets_buyer_id ON buyer_secrets(buyer_id);

-- Compliance events - essential for history lookups
CREATE INDEX idx_compliance_events_buyer_id ON compliance_events(buyer_id);
CREATE INDEX idx_compliance_events_dealer_id ON compliance_events(dealer_id);
CREATE INDEX idx_compliance_events_verification_id ON compliance_events(verification_id);
CREATE INDEX idx_compliance_events_buyer_reference ON compliance_events(buyer_reference_id);
CREATE INDEX idx_compliance_events_dealer_reference ON compliance_events(dealer_reference_id);

-- Payments - essential for user lookups and webhook processing
CREATE INDEX idx_payments_account_id ON payments(account_id);
CREATE INDEX idx_payments_customer_reference ON payments(customer_reference_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- CCPA-compliant foreign key for payments (SET NULL on delete)
ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_buyer_account 
  FOREIGN KEY (account_id) REFERENCES buyer_accounts(id) ON DELETE SET NULL;

ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_dealer_account 
  FOREIGN KEY (account_id) REFERENCES dealer_accounts(id) ON DELETE SET NULL;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate verification ID function
CREATE OR REPLACE FUNCTION generate_verification_id()
RETURNS TEXT AS $$
DECLARE
  year_suffix TEXT := to_char(NOW(), 'YYYY');
  sequence_num TEXT;
BEGIN
  -- Get next sequence number for the year (simple approach)
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0') INTO sequence_num
  FROM compliance_events 
  WHERE created_at >= date_trunc('year', NOW());
  
  RETURN CONCAT('VER_', year_suffix, '_', sequence_num);
END;
$$ LANGUAGE plpgsql;

-- Increment dealer query usage
CREATE OR REPLACE FUNCTION increment_dealer_query_count(dealer_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE dealer_accounts 
  SET queries_used_this_month = queries_used_this_month + 1
  WHERE id = dealer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get buyer audit logs
CREATE OR REPLACE FUNCTION get_buyer_audit_logs(buyer_uuid UUID)
RETURNS TABLE (
  event_id UUID,
  dealer_company TEXT,
  verification_status TEXT,
  transaction_purpose TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    da.company_name,
    ce.verification_status,
    ce.transaction_purpose,
    ce.created_at
  FROM compliance_events ce
  JOIN dealer_accounts da ON da.id = ce.dealer_id
  WHERE ce.buyer_id = buyer_uuid
  ORDER BY ce.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate immutable customer reference
CREATE OR REPLACE FUNCTION generate_customer_reference(account_uuid UUID, account_type TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Create deterministic but non-reversible reference
  -- Uses first 8 chars of account UUID hash + type prefix
  RETURN CASE account_type
    WHEN 'buyer' THEN 'BUY_' || SUBSTR(MD5(account_uuid::text), 1, 8)
    WHEN 'dealer' THEN 'DLR_' || SUBSTR(MD5(account_uuid::text), 1, 8)
    ELSE 'CUST_' || SUBSTR(MD5(account_uuid::text), 1, 8)
  END;
END;
$$ LANGUAGE plpgsql;

-- Account deletion anonymization functions  
CREATE OR REPLACE FUNCTION anonymize_compliance_events_for_buyer(buyer_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_events
  SET 
    buyer_id = NULL,
    buyer_deleted = true,
    buyer_deleted_at = NOW(),
    -- PRESERVE legal evidence - don't delete consent records
    buyer_consent_timestamp = buyer_consent_timestamp -- Keep original timestamp
    -- buyer_consent_given stays as-is for legal evidence
  WHERE buyer_id = buyer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION anonymize_compliance_events_for_dealer(dealer_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_events
  SET 
    dealer_id = NULL,
    dealer_deleted = true,
    dealer_deleted_at = NOW(),
    dealer_business_purpose = 'DELETED_ACCOUNT'
  WHERE dealer_id = dealer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUTO-UPDATE TRIGGERS
-- =============================================

-- Buyer accounts
CREATE TRIGGER buyer_accounts_updated_at
  BEFORE UPDATE ON buyer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Dealer accounts
CREATE TRIGGER dealer_accounts_updated_at
  BEFORE UPDATE ON dealer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Compliance events
CREATE TRIGGER compliance_events_updated_at
  BEFORE UPDATE ON compliance_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE buyer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Buyer accounts policies
CREATE POLICY "Buyers can view own account"
  ON buyer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Buyers can update own account"
  ON buyer_accounts FOR UPDATE
  USING (auth.uid() = auth_id);

-- Dealer accounts policies
CREATE POLICY "Dealers can view own account"
  ON dealer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Dealers can update own account"
  ON dealer_accounts FOR UPDATE
  USING (auth.uid() = auth_id);

-- Buyer secrets policies
CREATE POLICY "Buyers can view own secrets"
  ON buyer_secrets FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM buyer_accounts WHERE id = buyer_secrets.buyer_id
  ));

-- Compliance events policies
CREATE POLICY "Buyers can view own compliance events"
  ON compliance_events FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM buyer_accounts WHERE id = compliance_events.buyer_id
  ));

CREATE POLICY "Dealers can view their compliance events"
  ON compliance_events FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM dealer_accounts WHERE id = compliance_events.dealer_id
  ));

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM buyer_accounts WHERE auth_id = auth.uid()
      UNION
      SELECT id FROM dealer_accounts WHERE auth_id = auth.uid()
    )
  );

-- Service role policies (full access)
CREATE POLICY "Service role full access to buyer_accounts"
  ON buyer_accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to dealer_accounts"
  ON dealer_accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to buyer_secrets"
  ON buyer_secrets FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to compliance_events"
  ON compliance_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to payments"
  ON payments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE buyer_accounts IS 'Individual customers seeking identity verification ($39 one-time)';
COMMENT ON TABLE dealer_accounts IS 'Firearm accessory businesses with API access (monthly subscriptions)';
COMMENT ON TABLE buyer_secrets IS 'Encrypted PII vault for buyer verification data (Persona + Privado ID)';
COMMENT ON TABLE compliance_events IS 'AB 1263 compliance verification events with blockchain proofs';
COMMENT ON TABLE payments IS 'Payment tracking with immutable customer reference for CCPA compliance';

COMMENT ON COLUMN compliance_events.id IS 'UUIDv7 for chronological ordering - critical for court timeline reconstruction';
COMMENT ON COLUMN payments.account_id IS 'Live account reference, set to NULL when user deletes account per CCPA';
COMMENT ON COLUMN payments.customer_reference_id IS 'Immutable customer identifier for accounting continuity (e.g., BUY_a8b9c2d1)';
COMMENT ON COLUMN payments.transaction_type IS 'verification (buyers) or subscription (dealers)';
COMMENT ON COLUMN payments.payment_timestamp IS 'When the payment was processed by Stripe';