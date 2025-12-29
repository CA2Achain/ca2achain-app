-- =============================================
-- MIGRATION: Update Compliance Events - Remove Duplicate verification_id
-- =============================================
-- Date: 2025-01-03 (v2)
-- Changes: Remove verification_id (use main id), add blockchain_info JSON blob

-- =============================================
-- STEP 1: REMOVE DUPLICATE VERIFICATION IDs (CLEANUP)
-- =============================================

-- Delete duplicate compliance events (keep the earliest by timestamp)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY verification_id 
           ORDER BY verified_at ASC
         ) AS rn
  FROM compliance_events
)
DELETE FROM compliance_events 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- =============================================
-- STEP 2: UPDATE TABLE STRUCTURE 
-- =============================================

-- Add blockchain info JSON blob
ALTER TABLE compliance_events 
ADD COLUMN blockchain_info JSONB;

-- Migrate existing blockchain_transaction_hash to new JSON structure
UPDATE compliance_events 
SET blockchain_info = jsonb_build_object(
  'network', 'polygon-mainnet',
  'transaction_hash', blockchain_transaction_hash
)
WHERE blockchain_transaction_hash IS NOT NULL;

-- Set default for records without blockchain data
UPDATE compliance_events 
SET blockchain_info = jsonb_build_object('network', 'polygon-mainnet')
WHERE blockchain_info IS NULL;

-- Drop old blockchain_transaction_hash column
ALTER TABLE compliance_events 
DROP COLUMN IF EXISTS blockchain_transaction_hash;

-- =============================================
-- STEP 3: REMOVE REDUNDANT VERIFICATION_ID
-- =============================================

-- Drop verification_id constraint and column (use main id UUID instead)
ALTER TABLE compliance_events 
DROP CONSTRAINT IF EXISTS compliance_events_verification_id_key,
DROP CONSTRAINT IF EXISTS compliance_events_verification_id_unique,
DROP COLUMN verification_id;

-- Note: Main 'id' UUID serves as the verification identifier

-- =============================================
-- STEP 4: UPDATE INDEXES
-- =============================================

-- Add blockchain info indexes using proper JSONB indexing
CREATE INDEX idx_compliance_events_blockchain_tx ON compliance_events 
USING BTREE ((blockchain_info->>'transaction_hash'));

CREATE INDEX idx_compliance_events_blockchain_contract ON compliance_events 
USING BTREE ((blockchain_info->>'contract_address'));

-- Add GIN index on entire blockchain_info for complex queries
CREATE INDEX idx_compliance_events_blockchain_info ON compliance_events 
USING GIN (blockchain_info);

-- =============================================
-- STEP 5: UPDATE HELPER FUNCTIONS
-- =============================================

-- Drop existing functions with old verification_id parameter
DROP FUNCTION IF EXISTS get_compliance_event_by_blockchain_tx(text);
DROP FUNCTION IF EXISTS update_compliance_event_blockchain(UUID, text, text, bigint, bigint);
DROP FUNCTION IF EXISTS update_compliance_event_blockchain(UUID, jsonb);

-- Function to update blockchain information after Polygon transaction
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

-- Function to query compliance events by blockchain transaction hash
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