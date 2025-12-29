-- Migration: Minimal Account Deletion Support (Additive Only)
-- Date: 2025-12-29
-- Description: Add account deletion tracking without breaking existing schema

-- Add deletion tracking fields to compliance_events (additive only)
ALTER TABLE compliance_events 
  ADD COLUMN IF NOT EXISTS buyer_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_deleted_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS dealer_deleted BOOLEAN DEFAULT FALSE,  
  ADD COLUMN IF NOT EXISTS dealer_deleted_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS verification_response JSONB;

-- Add helpful indexes for deletion tracking (performance)
CREATE INDEX IF NOT EXISTS compliance_events_buyer_deleted_idx 
  ON compliance_events(buyer_deleted) WHERE buyer_deleted = TRUE;
CREATE INDEX IF NOT EXISTS compliance_events_dealer_deleted_idx 
  ON compliance_events(dealer_deleted) WHERE dealer_deleted = TRUE;

-- Add useful function for account deletion with anonymization
CREATE OR REPLACE FUNCTION anonymize_compliance_events_for_buyer(buyer_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_events
  SET 
    buyer_deleted = TRUE,
    buyer_deleted_at = NOW(),
    dealer_request = CASE 
      WHEN dealer_request IS NOT NULL THEN 
        jsonb_build_object(
          'transaction_id', dealer_request->>'transaction_id',
          'ab1263_disclosure_presented', dealer_request->>'ab1263_disclosure_presented',
          'acknowledgment_received', dealer_request->>'acknowledgment_received',
          'timestamp', dealer_request->>'timestamp',
          'buyer_email', 'DELETED_PER_CCPA',
          'buyer_dob', 'DELETED_PER_CCPA',
          'shipping_address', 'DELETED_PER_CCPA'
        )
      ELSE dealer_request
    END
  WHERE buyer_id = buyer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function for dealer account deletion
CREATE OR REPLACE FUNCTION anonymize_compliance_events_for_dealer(dealer_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_events
  SET 
    dealer_deleted = TRUE,
    dealer_deleted_at = NOW()
  WHERE dealer_id = dealer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for clarity
COMMENT ON COLUMN compliance_events.buyer_deleted IS 'TRUE when buyer account was deleted per CCPA rights. Verification record preserved for legal compliance.';
COMMENT ON COLUMN compliance_events.dealer_deleted IS 'TRUE when dealer account was deleted. Verification record preserved for AB 1263 audit requirements.';

-- Note: This migration preserves original foreign key constraints and cascade behavior
-- Account deletion in application code should use the anonymization functions above
-- before deleting the actual account records