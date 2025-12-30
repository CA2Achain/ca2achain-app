-- =============================================
-- MIGRATION: Update Dealer Accounts Billing System
-- =============================================
-- Date: 2025-01-03 (v3)
-- Changes: Remove Stripe dependency, add SaaS credit system, simplify billing

-- =============================================
-- STEP 1: ADD NEW BILLING COLUMNS
-- =============================================

-- Add new SaaS billing columns
ALTER TABLE dealer_accounts 
ADD COLUMN subscription_tier INTEGER DEFAULT 1 CHECK (subscription_tier IN (1, 2, 3)),
ADD COLUMN billing_date DATE,
ADD COLUMN billing_due_date DATE,
ADD COLUMN credits_purchased INTEGER DEFAULT 100,
ADD COLUMN additional_credits_purchased INTEGER DEFAULT 0,
ADD COLUMN credits_used INTEGER DEFAULT 0,
ADD COLUMN credits_expire_at TIMESTAMPTZ,
ADD COLUMN payment_info JSONB,
ADD COLUMN last_logged_in TIMESTAMPTZ;

-- =============================================
-- STEP 2: MIGRATE EXISTING DATA
-- =============================================

-- Set initial billing dates (15th of current month)
UPDATE dealer_accounts 
SET 
  billing_date = date_trunc('month', NOW())::date + 14, -- 15th of month
  billing_due_date = date_trunc('month', NOW())::date + 19, -- 20th of month (5-day grace)
  credits_expire_at = date_trunc('month', NOW()) + INTERVAL '1 month';

-- Migrate existing query limits to credit system
UPDATE dealer_accounts 
SET 
  credits_purchased = COALESCE(monthly_query_limit, 100),
  credits_used = COALESCE(queries_used_this_month, 0);

-- Set subscription tier based on current query limits
UPDATE dealer_accounts 
SET subscription_tier = CASE 
  WHEN monthly_query_limit <= 100 THEN 1    -- Starter tier
  WHEN monthly_query_limit <= 1000 THEN 2   -- Business tier  
  WHEN monthly_query_limit <= 10000 THEN 3  -- Enterprise tier
  ELSE 1 -- Default to tier 1
END;

-- Migrate Stripe data to generic payment info (if exists)
UPDATE dealer_accounts 
SET payment_info = jsonb_build_object(
  'provider', 'stripe',
  'customer_id', stripe_customer_id,
  'subscription_id', stripe_subscription_id
)
WHERE stripe_customer_id IS NOT NULL;

-- =============================================
-- STEP 3: REMOVE OLD COLUMNS
-- =============================================

-- Remove Stripe-specific columns
ALTER TABLE dealer_accounts 
DROP COLUMN IF EXISTS business_ein,
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS monthly_query_limit,
DROP COLUMN IF EXISTS queries_used_this_month,
DROP COLUMN IF EXISTS billing_period_start,
DROP COLUMN IF EXISTS billing_period_end;

-- =============================================
-- STEP 4: UPDATE BUYER ACCOUNTS (REMOVE STRIPE DEPENDENCY)
-- =============================================

-- Remove Stripe-specific column from buyer accounts
ALTER TABLE buyer_accounts 
DROP COLUMN IF EXISTS stripe_payment_id;

-- Add last logged in for buyer accounts
ALTER TABLE buyer_accounts 
ADD COLUMN last_logged_in TIMESTAMPTZ;

-- =============================================
-- STEP 5: UPDATE PAYMENTS TABLE (COMPLETE REDESIGN)
-- =============================================

-- Add specific account reference columns
ALTER TABLE payments 
ADD COLUMN buyer_id UUID,
ADD COLUMN dealer_id UUID;

-- Add foreign key constraints
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_buyer 
  FOREIGN KEY (buyer_id) REFERENCES buyer_accounts(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_payments_dealer 
  FOREIGN KEY (dealer_id) REFERENCES dealer_accounts(id) ON DELETE SET NULL;

-- Add constraint to ensure exactly one account type
ALTER TABLE payments 
ADD CONSTRAINT check_single_account 
  CHECK ((buyer_id IS NULL) != (dealer_id IS NULL));

-- Migrate existing account_id data based on transaction_type
UPDATE payments 
SET buyer_id = account_id 
WHERE transaction_type = 'verification';

UPDATE payments 
SET dealer_id = account_id 
WHERE transaction_type = 'subscription';

-- Add provider-agnostic payment info to payments table
ALTER TABLE payments 
ADD COLUMN payment_provider_info JSONB;

-- Migrate existing Stripe payment intent IDs to generic payment info
UPDATE payments 
SET payment_provider_info = jsonb_build_object(
  'provider', 'stripe',
  'payment_intent_id', stripe_payment_intent_id
)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Remove old columns
ALTER TABLE payments 
DROP COLUMN IF EXISTS account_id,
DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- Add indexes for new structure
CREATE INDEX idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX idx_payments_dealer_id ON payments(dealer_id);

-- =============================================
-- STEP 6: UPDATE HELPER FUNCTIONS
-- =============================================

-- Drop old query increment function
DROP FUNCTION IF EXISTS increment_dealer_query_count(UUID);

-- Function to check if dealer has available credits
CREATE OR REPLACE FUNCTION dealer_has_credits(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  available_credits INTEGER;
  credits_expired BOOLEAN;
BEGIN
  SELECT 
    (credits_purchased + additional_credits_purchased) - credits_used,
    NOW() > credits_expire_at
  INTO available_credits, credits_expired
  FROM dealer_accounts 
  WHERE id = dealer_uuid;
  
  -- Return true if credits available and not expired
  RETURN available_credits > 0 AND NOT credits_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use a dealer credit (atomic decrement)
CREATE OR REPLACE FUNCTION use_dealer_credit(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET 
    credits_used = credits_used + 1,
    updated_at = NOW()
  WHERE id = dealer_uuid 
    AND (credits_purchased + additional_credits_purchased) - credits_used > 0
    AND NOW() <= credits_expire_at;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add bulk credits to dealer
CREATE OR REPLACE FUNCTION add_dealer_credits(
  dealer_uuid UUID,
  credit_amount INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET 
    additional_credits_purchased = additional_credits_purchased + credit_amount,
    updated_at = NOW()
  WHERE id = dealer_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly credits (for billing cycle)
CREATE OR REPLACE FUNCTION reset_dealer_monthly_credits(dealer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dealer_accounts 
  SET 
    credits_used = 0,
    additional_credits_purchased = 0, -- Reset add-on credits monthly
    credits_expire_at = date_trunc('month', NOW()) + INTERVAL '1 month',
    billing_date = date_trunc('month', NOW())::date + 14, -- 15th of new month
    billing_due_date = date_trunc('month', NOW())::date + 19, -- 20th of new month
    updated_at = NOW()
  WHERE id = dealer_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update dealer last login
CREATE OR REPLACE FUNCTION update_last_login(
  account_table TEXT,
  account_uuid UUID
) RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('UPDATE %I SET last_logged_in = NOW() WHERE id = $1', account_table)
  USING account_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;