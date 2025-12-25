-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  persona_inquiry_id TEXT,
  polygon_credential_id TEXT,
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PII Vault (encrypted sensitive data)
CREATE TABLE pii_vault (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_name TEXT NOT NULL,
  encrypted_dob TEXT NOT NULL,
  encrypted_dl_number TEXT NOT NULL,
  encrypted_dl_expiration TEXT NOT NULL,
  encrypted_address TEXT NOT NULL,
  encrypted_polygon_credential TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  verification_expires_at TIMESTAMPTZ NOT NULL,
  verification_provider TEXT NOT NULL,
  verification_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Customers table (third-party businesses)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  privy_did UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_hash TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  monthly_query_limit INTEGER NOT NULL DEFAULT 1000,
  queries_used_this_month INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs (immutable record of all verifications)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  claim_verified TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('approved', 'denied'))
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_pii_vault_user_id ON pii_vault(user_id);
CREATE INDEX idx_customers_api_key_hash ON customers(api_key_hash);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_customer_id ON audit_logs(customer_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Function to increment customer query count
CREATE OR REPLACE FUNCTION increment_query_count(customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET queries_used_this_month = queries_used_this_month + 1,
      updated_at = NOW()
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly query counts (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_query_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET queries_used_this_month = 0,
      billing_period_start = NOW(),
      billing_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE billing_period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on customers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for pii_vault (service role only for security)
CREATE POLICY "Service role full access to pii_vault"
  ON pii_vault FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for customers
CREATE POLICY "Customers can view own data"
  ON customers FOR SELECT
  USING (auth.uid() = privy_did);

CREATE POLICY "Service role full access to customers"
  ON customers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE users.id = audit_logs.user_id
  ));

CREATE POLICY "Service role full access to audit_logs"
  ON audit_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');