-- =============================================
-- CA2ACHAIN PRODUCTION DATABASE SCHEMA
-- =============================================
-- Date: 2025-01-03 (consolidated production)
-- CCPA Compliant | AB 1263 Compliant | Blockchain Ready
-- UUIDv7 for chronological ordering | RLS enabled | Optimized indexes

-- =============================================
-- EXTENSIONS & CORE FUNCTIONS
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate immutable customer reference IDs (CCPA compliant)
CREATE OR REPLACE FUNCTION generate_customer_reference(customer_uuid UUID, customer_type TEXT)
RETURNS TEXT AS $$
DECLARE
  uuid_hash TEXT;
  prefix TEXT;
BEGIN
  -- Generate 8-character hash from UUID (deterministic)
  uuid_hash := SUBSTRING(encode(digest(customer_uuid::TEXT, 'sha256'), 'hex'), 1, 8);
  
  -- Set prefix based on customer type
  prefix := CASE customer_type
    WHEN 'buyer' THEN 'BUY_'
    WHEN 'dealer' THEN 'DLR_'
    ELSE 'CUS_'
  END;
  
  RETURN CONCAT(prefix, uuid_hash);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BUYER ACCOUNTS TABLE
-- =============================================

CREATE TABLE buyer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic contact info
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Immutable reference for ZKP hashes (CCPA compliant)
  buyer_reference_id TEXT UNIQUE NOT NULL,
  
  -- Verification status
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired', 'rejected')),
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  
  -- Current verification tracking
  current_verification_id UUID, -- References compliance_events(id)
  
  -- Privado ID integration
  privado_did TEXT,
  privado_credential_id TEXT,
  
  -- One-time payment tracking
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Activity tracking
  last_logged_in TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(auth_id)
);

-- Auto-generate buyer_reference_id on insert
CREATE OR REPLACE FUNCTION set_buyer_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_reference_id IS NULL THEN
    NEW.buyer_reference_id := generate_customer_reference(NEW.id, 'buyer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_buyer_reference_id
  BEFORE INSERT ON buyer_accounts
  FOR EACH ROW EXECUTE FUNCTION set_buyer_reference_id();

CREATE TRIGGER trigger_buyer_accounts_updated_at
  BEFORE UPDATE ON buyer_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- BUYER SECRETS TABLE (ENCRYPTED PII VAULT)
-- =============================================

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
-- DEALER ACCOUNTS TABLE
-- =============================================

CREATE TABLE dealer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business information
  company_name TEXT NOT NULL,
  business_email TEXT UNIQUE NOT NULL, -- company@business.com format required
  business_address JSONB, -- Structured address object
  business_phone TEXT,
  
  -- Immutable reference for audit trail (CCPA compliant)
  dealer_reference_id TEXT UNIQUE NOT NULL,
  
  -- API authentication
  api_key_hash TEXT NOT NULL,
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- SaaS billing system
  subscription_tier INTEGER DEFAULT 1 CHECK (subscription_tier IN (1, 2, 3)),
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  billing_date DATE,
  billing_due_date DATE,
  
  -- Credit system (base + add-ons)
  credits_purchased INTEGER DEFAULT 100,
  additional_credits_purchased INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  credits_expire_at TIMESTAMPTZ,
  
  -- Payment method (provider-agnostic)
  payment_info JSONB,
  
  -- Activity tracking
  last_logged_in TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(auth_id)
);

-- Auto-generate dealer_reference_id on insert
CREATE OR REPLACE FUNCTION set_dealer_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dealer_reference_id IS NULL THEN
    NEW.dealer_reference_id := generate_customer_reference(NEW.id, 'dealer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_dealer_reference_id
  BEFORE INSERT ON dealer_accounts
  FOR EACH ROW EXECUTE FUNCTION set_dealer_reference_id();

CREATE TRIGGER trigger_dealer_accounts_updated_at
  BEFORE UPDATE ON dealer_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMPLIANCE EVENTS TABLE (BLOCKCHAIN-READY)
-- =============================================

CREATE TABLE compliance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- UUIDv7 for timeline ordering
  
  -- Efficient querying (nullable for CCPA compliance)
  buyer_id UUID REFERENCES buyer_accounts(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES dealer_accounts(id) ON DELETE SET NULL,
  
  -- Immutable audit trail (survive deletions)
  buyer_reference_id TEXT NOT NULL, -- 'BUY_a8b9c2d1' - CCPA compliant
  dealer_reference_id TEXT NOT NULL, -- 'DLR_f3e4d5c6' - Business continuity
  
  -- Complete verification record (enhanced JSON structure for hash reproducibility)
  verification_data JSONB NOT NULL, -- Enhanced JSON with ZKP proofs + commitment hashes
  
  -- Quick-access verification results (extracted from JSON for efficient queries)
  age_verified BOOLEAN NOT NULL,
  address_verified BOOLEAN NOT NULL,
  
  -- Blockchain integration (court liability removal)
  blockchain_info JSONB, -- Polygon network info, contract address, transaction hash
  
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set current_verification_id in buyer_accounts when compliance event is created
CREATE OR REPLACE FUNCTION update_buyer_current_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update buyer's current_verification_id
  UPDATE buyer_accounts 
  SET current_verification_id = NEW.id,
      verification_status = CASE 
        WHEN NEW.age_verified AND NEW.address_verified THEN 'verified'
        ELSE 'rejected'
      END,
      verified_at = NEW.verified_at
  WHERE id = NEW.buyer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buyer_current_verification
  AFTER INSERT ON compliance_events
  FOR EACH ROW EXECUTE FUNCTION update_buyer_current_verification();

-- =============================================
-- PAYMENTS TABLE
-- =============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), -- UUIDv7 for chronological ordering
  
  -- Specific account references (one will be null)
  buyer_id UUID REFERENCES buyer_accounts(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES dealer_accounts(id) ON DELETE SET NULL,
  
  -- Payment details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('verification', 'subscription')),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Immutable customer reference (survives CCPA deletion)
  customer_reference_id TEXT NOT NULL, -- 'BUY_a8b9c2d1' or 'DLR_f3e4d5c6'
  
  -- Payment provider info (generic)
  payment_provider_info JSONB,
  
  payment_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_single_account CHECK ((buyer_id IS NULL) != (dealer_id IS NULL))
);

-- =============================================
-- OPTIMIZED INDEXES (ESSENTIAL ONLY)
-- =============================================

-- Buyer accounts
CREATE INDEX idx_buyer_accounts_auth_id ON buyer_accounts(auth_id);
CREATE INDEX idx_buyer_accounts_buyer_reference_id ON buyer_accounts(buyer_reference_id);

-- Buyer secrets (encrypted data access)
CREATE INDEX idx_buyer_secrets_buyer_id ON buyer_secrets(buyer_id);

-- Dealer accounts
CREATE INDEX idx_dealer_accounts_auth_id ON dealer_accounts(auth_id);
CREATE INDEX idx_dealer_accounts_business_email ON dealer_accounts(business_email);
CREATE INDEX idx_dealer_accounts_api_key_hash ON dealer_accounts(api_key_hash);
CREATE INDEX idx_dealer_accounts_dealer_reference_id ON dealer_accounts(dealer_reference_id);

-- Compliance events (verification queries)
CREATE INDEX idx_compliance_events_buyer_id ON compliance_events(buyer_id);
CREATE INDEX idx_compliance_events_dealer_id ON compliance_events(dealer_id);
CREATE INDEX idx_compliance_events_buyer_reference ON compliance_events(buyer_reference_id);
CREATE INDEX idx_compliance_events_dealer_reference ON compliance_events(dealer_reference_id);

-- Payments (financial records)
CREATE INDEX idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX idx_payments_dealer_id ON payments(dealer_id);
CREATE INDEX idx_payments_customer_reference_id ON payments(customer_reference_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE buyer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Buyer Accounts Policies
CREATE POLICY "Users can view their own buyer account"
  ON buyer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own buyer account"
  ON buyer_accounts FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Service role can manage all buyer accounts"
  ON buyer_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- Buyer Secrets Policies (most restrictive)
CREATE POLICY "Service role only for buyer secrets"
  ON buyer_secrets FOR ALL
  USING (auth.role() = 'service_role');

-- Dealer Accounts Policies
CREATE POLICY "Users can view their own dealer account"
  ON dealer_accounts FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own dealer account"
  ON dealer_accounts FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Service role can manage all dealer accounts"
  ON dealer_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- Compliance Events Policies
CREATE POLICY "Buyers can view their own compliance events"
  ON compliance_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM buyer_accounts 
    WHERE buyer_accounts.id = compliance_events.buyer_id 
    AND buyer_accounts.auth_id = auth.uid()
  ));

CREATE POLICY "Dealers can view their own compliance events"
  ON compliance_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dealer_accounts 
    WHERE dealer_accounts.id = compliance_events.dealer_id 
    AND dealer_accounts.auth_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all compliance events"
  ON compliance_events FOR ALL
  USING (auth.role() = 'service_role');

-- Payments Policies  
CREATE POLICY "Buyers can view their own payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM buyer_accounts 
    WHERE buyer_accounts.id = payments.buyer_id 
    AND buyer_accounts.auth_id = auth.uid()
  ));

CREATE POLICY "Dealers can view their own payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dealer_accounts 
    WHERE dealer_accounts.id = payments.dealer_id 
    AND dealer_accounts.auth_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ESSENTIAL HELPER FUNCTIONS
-- =============================================

-- Credit management functions (for SaaS billing)
CREATE OR REPLACE FUNCTION dealer_has_credits(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  available_credits INTEGER;
  credits_expired BOOLEAN;
BEGIN
  SELECT 
    (credits_purchased + additional_credits_purchased) - credits_used,
    (credits_expire_at < NOW())
  INTO available_credits, credits_expired
  FROM dealer_accounts 
  WHERE id = dealer_uuid;
  
  RETURN available_credits > 0 AND NOT credits_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_dealer_credit(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET credits_used = credits_used + 1
  WHERE id = dealer_uuid 
    AND dealer_has_credits(dealer_uuid);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_dealer_credits(dealer_uuid UUID, credit_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET additional_credits_purchased = additional_credits_purchased + credit_amount
  WHERE id = dealer_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reset_dealer_monthly_credits(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET 
    credits_used = 0,
    additional_credits_purchased = 0,
    billing_date = date_trunc('month', NOW())::date + 14,
    billing_due_date = date_trunc('month', NOW())::date + 19,
    credits_expire_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE id = dealer_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity tracking
CREATE OR REPLACE FUNCTION update_last_login(account_table TEXT, account_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF account_table = 'buyer_accounts' THEN
    UPDATE buyer_accounts SET last_logged_in = NOW() WHERE id = account_uuid;
  ELSIF account_table = 'dealer_accounts' THEN
    UPDATE dealer_accounts SET last_logged_in = NOW() WHERE id = account_uuid;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Blockchain integration functions
CREATE OR REPLACE FUNCTION update_compliance_event_blockchain(
  p_compliance_event_id UUID,
  p_blockchain_info JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE compliance_events 
  SET blockchain_info = p_blockchain_info
  WHERE id = p_compliance_event_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_compliance_event_by_blockchain_tx(p_transaction_hash TEXT)
RETURNS TABLE (
  compliance_event_id UUID,
  buyer_reference_id TEXT,
  dealer_reference_id TEXT,
  age_verified BOOLEAN,
  address_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  blockchain_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id as compliance_event_id,
    ce.buyer_reference_id,
    ce.dealer_reference_id,
    ce.age_verified,
    ce.address_verified,
    ce.verified_at,
    ce.blockchain_info
  FROM compliance_events ce
  WHERE ce.blockchain_info->>'transaction_hash' = p_transaction_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;