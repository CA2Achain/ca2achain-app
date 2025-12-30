-- =============================================
-- EMERGENCY RESET: DROP ALL TABLES AND FUNCTIONS
-- =============================================
-- WARNING: This completely destroys all data!
-- Use only for development or complete fresh start

-- Drop all tables and reset completely
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS compliance_events CASCADE;
DROP TABLE IF EXISTS buyer_secrets CASCADE; 
DROP TABLE IF EXISTS dealer_accounts CASCADE;
DROP TABLE IF EXISTS buyer_accounts CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;

-- Drop all custom functions (including any legacy ones)
DROP FUNCTION IF EXISTS uuid_generate_v7() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_verification_id() CASCADE;
DROP FUNCTION IF EXISTS increment_dealer_query_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_buyer_audit_logs(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_customer_reference(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS anonymize_compliance_events_for_buyer(UUID) CASCADE;
DROP FUNCTION IF EXISTS anonymize_compliance_events_for_dealer(UUID) CASCADE;
DROP FUNCTION IF EXISTS dealer_has_credits(UUID) CASCADE;
DROP FUNCTION IF EXISTS use_dealer_credit(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_dealer_credits(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reset_dealer_monthly_credits(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_last_login(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_compliance_event_blockchain(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS get_compliance_event_by_blockchain_tx(TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_buyer_reference_id() CASCADE;
DROP FUNCTION IF EXISTS set_dealer_reference_id() CASCADE;
DROP FUNCTION IF EXISTS update_buyer_current_verification() CASCADE;

-- Drop legacy functions that may exist from old migrations
DROP FUNCTION IF EXISTS calculate_net_amount() CASCADE;
DROP FUNCTION IF EXISTS calculate_net_amount(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_net_amount(NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_metrics(TEXT, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_buyer() CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_buyer(UUID) CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_dealer() CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_dealer(UUID) CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_account() CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_account(UUID) CASCADE;
DROP FUNCTION IF EXISTS anonymize_payments_for_account(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_monthly_query_counts() CASCADE;
DROP FUNCTION IF EXISTS can_dealer_query() CASCADE;
DROP FUNCTION IF EXISTS can_dealer_query(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_dealer_query(UUID, INTEGER) CASCADE;

-- Nuclear option: Drop by searching for any function containing these names
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions that start with get_revenue_metrics
    FOR func_record IN 
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_name LIKE 'get_revenue_metrics%'
        AND routine_schema = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_schema || '.' || func_record.routine_name || ' CASCADE';
    END LOOP;
END
$$;

-- Drop extensions (will be recreated in main migration)
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;

-- Reset complete - ready for fresh schema installation