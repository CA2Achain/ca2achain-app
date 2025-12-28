-- Additional Indexes - Add These When Specific Features Are Needed
-- Run these individually as you encounter slow queries or add new features

-- =============================================
-- ADMIN DASHBOARD INDEXES
-- =============================================

-- For filtering by account types and statuses in admin dashboard
CREATE INDEX idx_auth_accounts_type ON auth_accounts(account_type);
CREATE INDEX idx_buyer_accounts_verification_status ON buyer_accounts(verification_status);
CREATE INDEX idx_dealer_accounts_subscription_status ON dealer_accounts(subscription_status);
CREATE INDEX idx_compliance_events_blockchain_status ON compliance_events(blockchain_status);

-- =============================================
-- TIME-BASED REPORTING INDEXES
-- =============================================

-- For analytics and reporting queries by time
CREATE INDEX idx_compliance_events_created_at ON compliance_events(created_at DESC);
CREATE INDEX idx_buyer_accounts_created_at ON buyer_accounts(created_at DESC);
CREATE INDEX idx_dealer_accounts_created_at ON dealer_accounts(created_at DESC);

-- =============================================
-- EXPIRATION MANAGEMENT INDEXES
-- =============================================

-- For cleanup jobs and expiration warnings
CREATE INDEX idx_buyer_accounts_expires_at ON buyer_accounts(verification_expires_at);
CREATE INDEX idx_buyer_accounts_expired 
  ON buyer_accounts(verification_expires_at) 
  WHERE verification_expires_at < NOW();

-- For billing period management
CREATE INDEX idx_dealer_accounts_billing_end ON dealer_accounts(billing_period_end);

-- =============================================
-- ADVANCED SEARCH INDEXES (Expensive)
-- =============================================

-- For complex JSONB searches (use sparingly - memory intensive)
CREATE INDEX idx_compliance_events_dealer_request_gin 
  ON compliance_events USING GIN (dealer_request);
CREATE INDEX idx_compliance_events_privado_proofs_gin 
  ON compliance_events USING GIN (privado_proofs);
CREATE INDEX idx_compliance_events_compliance_attestation_gin 
  ON compliance_events USING GIN (compliance_attestation);

-- For email pattern searches in compliance events
CREATE INDEX idx_compliance_events_dealer_request_buyer_email 
  ON compliance_events ((dealer_request->>'buyer_email'));

-- =============================================
-- AUDIT AND COMPLIANCE INDEXES
-- =============================================

-- For Privado ID credential lookups
CREATE INDEX idx_buyer_accounts_privado_did ON buyer_accounts(privado_did);
CREATE INDEX idx_buyer_accounts_privado_credential_id ON buyer_accounts(privado_credential_id);

-- For court timeline reconstruction (if chronological order not sufficient)
CREATE INDEX idx_compliance_events_verification_result ON compliance_events(verification_result);

-- =============================================
-- USAGE EXAMPLES
-- =============================================

/*
Add indexes based on actual slow queries:

-- If you have slow admin dashboard queries:
CREATE INDEX idx_buyer_accounts_verification_status ON buyer_accounts(verification_status);

-- If you run expiration cleanup jobs:
CREATE INDEX idx_buyer_accounts_expired 
  ON buyer_accounts(verification_expires_at) 
  WHERE verification_expires_at < NOW();

-- If you need complex JSONB searches:
CREATE INDEX idx_compliance_events_dealer_request_gin 
  ON compliance_events USING GIN (dealer_request);

-- Always check query performance first:
EXPLAIN ANALYZE SELECT * FROM compliance_events WHERE dealer_request->>'transaction_id' = 'ORDER-123';

-- If the query plan shows sequential scans, then add the relevant index
*/