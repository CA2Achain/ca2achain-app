-- Migration: Complete CA2AChain Database Schema with Privado ID
-- Date: 2025-12-27
-- Description: AB 1263 compliance identity verification service schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- UUID v7 FUNCTION FOR CHRONOLOGICAL ORDERING
-- =============================================

-- Custom UUIDv7 function for PostgreSQL (chronological ordering)
-- Benefits for compliance_events table:
-- 1. Court timeline reconstruction - IDs naturally sort by creation time
-- 2. Better database performance - sequential clustering improves B-tree efficiency
-- 3. Audit trail ordering - verification events maintain chronological sequence
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
-- SHARED AUTHENTICATION TABLE
-- =============================================

-- Shared auth for both buyers and dealers
CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('buyer', 'dealer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUYER TABLES
-- =============================================

-- Buyer accounts (public data)
CREATE TABLE buyer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'verified', 'expired', 'rejected')),
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  
  -- Privado ID integration
  privado_did TEXT, -- did:polygonid:polygon:mumbai:...
  privado_credential_id TEXT,
  
  -- One-time payment
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(auth_id)
);

-- Buyer secrets (encrypted PII vault - CCPA deletable)
CREATE TABLE buyer_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES buyer_accounts(id) ON DELETE CASCADE,
  
  -- Encrypted Persona PII data
  encrypted_persona_data JSONB NOT NULL,
  /* Structure:
  {
    "name": "ENCRYPTED_full_name",
    "dob": "ENCRYPTED_1990-01-15", 
    "dl_number": "ENCRYPTED_D1234567",
    "dl_expiration": "ENCRYPTED_2029-01-15",
    "address_original": "ENCRYPTED_123 E Main St Apt 5",
    "address_normalized": "ENCRYPTED_123 E MAIN ST APT 5 LOS ANGELES CA 90001"
  }
  */
  
  -- Encrypted Privado ID credential
  encrypted_privado_credential TEXT NOT NULL,
  
  -- Encryption metadata
  encryption_key_id UUID NOT NULL,
  persona_verification_session TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(buyer_id)
);

-- =============================================
-- DEALER TABLES
-- =============================================

-- Dealer accounts (firearm accessory sellers)
CREATE TABLE dealer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  
  -- Simple API key authentication
  api_key_hash TEXT UNIQUE NOT NULL,
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stripe billing
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  monthly_query_limit INTEGER NOT NULL DEFAULT 1000,
  queries_used_this_month INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(auth_id)
);

-- =============================================
-- COMPLIANCE & VERIFICATION TABLES
-- =============================================

-- Compliance events (combined verification log + blockchain records)
CREATE TABLE compliance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- UUIDv7 for chronological ordering
  verification_id TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES buyer_accounts(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  
  -- Original dealer request (structured)
  dealer_request JSONB NOT NULL,
  /* Structure:
  {
    "buyer_email": "user@example.com",
    "buyer_dob": "1990-01-15",
    "shipping_address": "123 E Main St",
    "transaction_id": "ORDER-789",
    "ab1263_disclosure_presented": true,
    "acknowledgment_received": true,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/...",
    "timestamp": "2026-01-15T14:30:20Z"
  }
  */
  
  -- Privado ID ZK proofs
  privado_proofs JSONB NOT NULL,
  /* Structure:
  {
    "age_verification_proof": {
      "proof": {
        "proof_a": ["..."],
        "proof_b": [["..."]],
        "proof_c": ["..."],
        "protocol": "groth16"
      },
      "public_signals": ["1"] // 1 = over 18, 0 = under 18
    },
    "address_verification_proof": {
      "proof": { ... },
      "public_signals": ["1"] // 1 = match, 0 = no match
    }
  }
  */
  
  -- AB 1263 compliance attestation
  compliance_attestation JSONB NOT NULL,
  /* Structure:
  {
    "dealer_id": "uuid",
    "ab1263_disclosure_presented": true,
    "acknowledgment_received": true,
    "compliance_version": "AB1263-2026.1",
    "attestation_timestamp": "2026-01-15T14:30:22Z"
  }
  */
  
  -- Blockchain integration
  blockchain_status TEXT NOT NULL CHECK (blockchain_status IN ('pending', 'submitted', 'confirmed', 'failed')),
  polygon_tx_hash TEXT UNIQUE,
  polygon_block_number BIGINT,
  
  -- Verification results (for fast queries)
  verification_result TEXT NOT NULL CHECK (verification_result IN ('PASS', 'FAIL')),
  age_verified BOOLEAN NOT NULL,
  address_verified BOOLEAN NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ESSENTIAL INDEXES ONLY (Performance Critical)
-- =============================================

-- INCLUDED: Only indexes critical for API performance and data integrity
-- EXCLUDED: Status filters, time-based queries, expensive GIN indexes
-- 
-- ADD LATER WHEN NEEDED:
-- - Verification status filters (if dashboard has status-based queries)
-- - Expiration date queries (if running cleanup jobs)
-- - Full JSONB GIN indexes (if complex JSON searches needed)
-- - Time-based reporting indexes (if analytics dashboard built)
-- - Blockchain status tracking (if admin monitoring needed)

-- Auth and lookup indexes (essential for API performance)
CREATE INDEX idx_auth_accounts_email ON auth_accounts(email);
CREATE INDEX idx_dealer_accounts_api_key_hash ON dealer_accounts(api_key_hash);

-- Foreign key indexes (essential for JOIN performance)
CREATE INDEX idx_buyer_accounts_auth_id ON buyer_accounts(auth_id);
CREATE INDEX idx_dealer_accounts_auth_id ON dealer_accounts(auth_id);
CREATE INDEX idx_buyer_secrets_buyer_id ON buyer_secrets(buyer_id);
CREATE INDEX idx_compliance_events_buyer_id ON compliance_events(buyer_id);
CREATE INDEX idx_compliance_events_dealer_id ON compliance_events(dealer_id);

-- Primary business query indexes (core API endpoints)
CREATE INDEX idx_compliance_events_verification_id ON compliance_events(verification_id);

-- Critical JSONB field lookup (transaction lookups)
CREATE INDEX idx_compliance_events_dealer_request_transaction_id 
  ON compliance_events ((dealer_request->>'transaction_id'));

-- Blockchain unique constraint support
CREATE INDEX idx_compliance_events_polygon_tx_hash ON compliance_events(polygon_tx_hash);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to generate chronological verification IDs
-- Uses UUIDv7 prefix for natural time-ordering (newer IDs > older IDs)
-- Format: VER-01847D2A (8 hex chars from UUIDv7 timestamp portion)
CREATE OR REPLACE FUNCTION generate_verification_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'VER-' || UPPER(substring(uuid_generate_v7()::text from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Function to increment dealer query count
CREATE OR REPLACE FUNCTION increment_dealer_query_count(dealer_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE dealer_accounts
  SET queries_used_this_month = queries_used_this_month + 1,
      updated_at = NOW()
  WHERE id = dealer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly query counts (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_query_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE dealer_accounts
  SET queries_used_this_month = 0,
      billing_period_start = NOW(),
      billing_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE billing_period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if dealer can make more queries
CREATE OR REPLACE FUNCTION can_dealer_query(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  dealer_record RECORD;
BEGIN
  SELECT subscription_status, queries_used_this_month, monthly_query_limit
  INTO dealer_record
  FROM dealer_accounts
  WHERE id = dealer_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check subscription is active
  IF dealer_record.subscription_status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;
  
  -- Check query limit
  IF dealer_record.queries_used_this_month >= dealer_record.monthly_query_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get buyer audit logs (CCPA compliance)
CREATE OR REPLACE FUNCTION get_buyer_audit_logs(buyer_uuid UUID)
RETURNS TABLE (
  verification_id TEXT,
  dealer_company_name TEXT,
  verified_claims TEXT[],
  event_timestamp TIMESTAMPTZ,
  result TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.verification_id,
    da.company_name,
    ARRAY['age_verification', 'address_verification'] as verified_claims,
    ce.created_at,
    ce.verification_result
  FROM compliance_events ce
  JOIN dealer_accounts da ON da.id = ce.dealer_id
  WHERE ce.buyer_id = buyer_uuid
  ORDER BY ce.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================

-- Generic update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
CREATE TRIGGER auth_accounts_updated_at
BEFORE UPDATE ON auth_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER buyer_accounts_updated_at
BEFORE UPDATE ON buyer_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dealer_accounts_updated_at
BEFORE UPDATE ON dealer_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;

-- Auth accounts policies
CREATE POLICY "Users can view own auth account"
  ON auth_accounts FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own auth account"
  ON auth_accounts FOR UPDATE
  USING (auth.uid() = id);

-- Buyer accounts policies  
CREATE POLICY "Buyers can view own account"
  ON buyer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Service role full access to buyer_accounts"
  ON buyer_accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Buyer secrets policies (service role only for security)
CREATE POLICY "Service role full access to buyer_secrets"
  ON buyer_secrets FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Dealer accounts policies
CREATE POLICY "Dealers can view own account"
  ON dealer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Service role full access to dealer_accounts"
  ON dealer_accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Compliance events policies
CREATE POLICY "Buyers can view own compliance events"
  ON compliance_events FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM buyer_accounts WHERE id = compliance_events.buyer_id
  ));

CREATE POLICY "Dealers can view own compliance events"
  ON compliance_events FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM dealer_accounts WHERE id = compliance_events.dealer_id
  ));

CREATE POLICY "Service role full access to compliance_events"
  ON compliance_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- INITIAL DATA / CONFIGURATION
-- =============================================

-- Create admin user type for future use
DO $$
BEGIN
  -- This can be used later for admin dashboard
  -- No initial data needed for now
END $$;

-- Comments for documentation
COMMENT ON TABLE auth_accounts IS 'Shared authentication table for buyers and dealers';
COMMENT ON TABLE buyer_accounts IS 'Public buyer data with Privado ID integration';
COMMENT ON TABLE buyer_secrets IS 'Encrypted PII vault - CCPA deletable';
COMMENT ON TABLE dealer_accounts IS 'Firearm accessory dealer accounts with API keys';
COMMENT ON TABLE compliance_events IS 'AB 1263 compliance verification events with ZK proofs';