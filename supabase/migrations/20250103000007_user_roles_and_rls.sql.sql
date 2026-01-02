-- =============================================
-- USER ROLES & ENHANCED ROW LEVEL SECURITY
-- =============================================
-- Date: 2025-01-03
-- Purpose: Add user_roles table and enhance existing RLS policies with role enforcement
-- Security: Users can only be buyer OR dealer (never both)
-- Note: This migration updates existing RLS policies from 20250103000006

-- =============================================
-- USER ROLES TABLE
-- =============================================

CREATE TABLE user_roles (
  auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'dealer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: CASCADE is intentional here - when a user is deleted from auth.users,
-- their role entry should also be deleted. This is different from compliance_events
-- and payments tables, which use SET NULL to preserve audit trails per CCPA requirements.

-- Auto-update updated_at timestamp
CREATE TRIGGER trigger_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for fast role lookups
CREATE INDEX idx_user_roles_auth_id ON user_roles(auth_id);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER_ROLES RLS POLICIES
-- =============================================

-- Users can read their own role
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth_id = auth.uid());

-- Only service role can insert/update/delete roles
-- This prevents users from changing their own role
CREATE POLICY "Service role can manage roles"
  ON user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- DROP EXISTING WEAK RLS POLICIES
-- =============================================

-- Drop existing buyer_accounts policies
DROP POLICY IF EXISTS "Users can view their own buyer account" ON buyer_accounts;
DROP POLICY IF EXISTS "Users can update their own buyer account" ON buyer_accounts;
DROP POLICY IF EXISTS "Service role can manage all buyer accounts" ON buyer_accounts;

-- Drop existing buyer_secrets policies
DROP POLICY IF EXISTS "Service role only for buyer secrets" ON buyer_secrets;

-- Drop existing dealer_accounts policies
DROP POLICY IF EXISTS "Users can view their own dealer account" ON dealer_accounts;
DROP POLICY IF EXISTS "Users can update their own dealer account" ON dealer_accounts;
DROP POLICY IF EXISTS "Service role can manage all dealer accounts" ON dealer_accounts;

-- =============================================
-- ENHANCED BUYER_ACCOUNTS RLS POLICIES
-- =============================================

-- Buyers can view their own account (with role verification)
CREATE POLICY "Buyers can view their own account"
  ON buyer_accounts
  FOR SELECT
  USING (
    auth_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'buyer'
    )
  );

-- Buyers can update their own account (with role verification)
CREATE POLICY "Buyers can update their own account"
  ON buyer_accounts
  FOR UPDATE
  USING (
    auth_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'buyer'
    )
  );

-- Service role can manage all buyer accounts
CREATE POLICY "Service role can manage buyer accounts"
  ON buyer_accounts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ENHANCED BUYER_SECRETS RLS POLICIES
-- =============================================

-- Buyers can view their own encrypted secrets (with role verification)
CREATE POLICY "Buyers can view their own secrets"
  ON buyer_secrets
  FOR SELECT
  USING (
    buyer_id IN (
      SELECT id FROM buyer_accounts 
      WHERE auth_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'buyer'
    )
  );

-- Buyers can update their own secrets (for re-verification with Persona)
CREATE POLICY "Buyers can update their own secrets"
  ON buyer_secrets
  FOR UPDATE
  USING (
    buyer_id IN (
      SELECT id FROM buyer_accounts 
      WHERE auth_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'buyer'
    )
  );

-- Service role can manage all buyer secrets
CREATE POLICY "Service role can manage buyer secrets"
  ON buyer_secrets
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ENHANCED DEALER_ACCOUNTS RLS POLICIES
-- =============================================

-- Dealers can view their own account (with role verification)
CREATE POLICY "Dealers can view their own account"
  ON dealer_accounts
  FOR SELECT
  USING (
    auth_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'dealer'
    )
  );

-- Dealers can update their own account (with role verification)
CREATE POLICY "Dealers can update their own account"
  ON dealer_accounts
  FOR UPDATE
  USING (
    auth_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 'dealer'
    )
  );

-- Service role can manage all dealer accounts
CREATE POLICY "Service role can manage dealer accounts"
  ON dealer_accounts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTION: Get user role
-- =============================================

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE auth_id = user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CONSTRAINT: Enforce one role per user
-- =============================================

-- Prevent creating buyer_accounts if user has dealer role
CREATE OR REPLACE FUNCTION enforce_buyer_role()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE auth_id = NEW.auth_id 
    AND role = 'dealer'
  ) THEN
    RAISE EXCEPTION 'User already has dealer role, cannot create buyer account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_buyer_role
  BEFORE INSERT ON buyer_accounts
  FOR EACH ROW EXECUTE FUNCTION enforce_buyer_role();

-- Prevent creating dealer_accounts if user has buyer role
CREATE OR REPLACE FUNCTION enforce_dealer_role()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE auth_id = NEW.auth_id 
    AND role = 'buyer'
  ) THEN
    RAISE EXCEPTION 'User already has buyer role, cannot create dealer account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_dealer_role
  BEFORE INSERT ON dealer_accounts
  FOR EACH ROW EXECUTE FUNCTION enforce_dealer_role();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_roles IS 'Single source of truth for user roles. Each user can only be buyer OR dealer, never both.';
COMMENT ON COLUMN user_roles.role IS 'User role: buyer or dealer. Immutable after creation.';
COMMENT ON FUNCTION get_user_role IS 'Helper function to get user role by auth_id. Used by RLS policies and backend.';
COMMENT ON POLICY "Buyers can view their own secrets" ON buyer_secrets IS 'Buyers can view their encrypted PII for transparency and data portability (CCPA compliance).';
COMMENT ON POLICY "Buyers can update their own secrets" ON buyer_secrets IS 'Buyers can update secrets when re-verifying with Persona (e.g., new ID, expired verification).';