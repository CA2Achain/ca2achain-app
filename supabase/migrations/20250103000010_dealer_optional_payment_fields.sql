-- Migration: Make dealer payment/subscription fields optional
-- Dealers can complete profile without payment setup

-- Make API key optional (generated only after payment)
ALTER TABLE dealer_accounts 
  ALTER COLUMN api_key_hash DROP NOT NULL,
  ALTER COLUMN api_key_hash DROP DEFAULT;

ALTER TABLE dealer_accounts
  ALTER COLUMN api_key_created_at DROP NOT NULL,
  ALTER COLUMN api_key_created_at DROP DEFAULT;

-- Make subscription fields optional
ALTER TABLE dealer_accounts 
  ALTER COLUMN billing_date DROP NOT NULL,
  ALTER COLUMN billing_date DROP DEFAULT;

ALTER TABLE dealer_accounts 
  ALTER COLUMN billing_due_date DROP NOT NULL,
  ALTER COLUMN billing_due_date DROP DEFAULT;

-- Make payment fields optional
ALTER TABLE dealer_accounts 
  ALTER COLUMN payment_info DROP NOT NULL,
  ALTER COLUMN payment_info DROP DEFAULT;

-- Make credit fields optional (no credits until subscription active)
ALTER TABLE dealer_accounts 
  ALTER COLUMN credits_purchased DROP DEFAULT,
  ALTER COLUMN credits_purchased DROP NOT NULL;

ALTER TABLE dealer_accounts 
  ALTER COLUMN additional_credits_purchased DROP DEFAULT,
  ALTER COLUMN additional_credits_purchased DROP NOT NULL;

ALTER TABLE dealer_accounts 
  ALTER COLUMN credits_used DROP DEFAULT,
  ALTER COLUMN credits_used DROP NOT NULL;

ALTER TABLE dealer_accounts 
  ALTER COLUMN credits_expire_at DROP DEFAULT,
  ALTER COLUMN credits_expire_at DROP NOT NULL;

-- Add comments explaining the flow
COMMENT ON COLUMN dealer_accounts.api_key_hash IS 'Generated after subscription payment - NULL until dealer subscribes';
COMMENT ON COLUMN dealer_accounts.subscription_tier IS 'NULL until dealer selects and pays for a tier';
COMMENT ON COLUMN dealer_accounts.subscription_status IS 'NULL until subscription created';
COMMENT ON COLUMN dealer_accounts.credits_purchased IS 'NULL until subscription active';