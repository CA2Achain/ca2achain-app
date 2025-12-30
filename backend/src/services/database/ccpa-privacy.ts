import { getClient } from './connection.js';
import { deleteBuyerSecrets } from './buyer-secrets.js';
import { anonymizeComplianceEvents } from './compliance-events.js';
import { anonymizePayments } from './payment-events.js';
import { deleteBuyerAccount } from './buyer-accounts.js';
import type { BuyerDataExport } from '@ca2achain/shared';

interface BuyerDataDeletionSummary {
  buyerId: string;
  secretsDeleted: boolean;
  eventsAnonymized: number;
  paymentsAnonymized: number;
  accountDeleted: boolean;
  completedAt: string;
}

/**
 * Complete buyer data deletion (CCPA "Right to be Forgotten")
 * Coordinates deletion across all tables in proper order
 */
export const deleteBuyerData = async (buyerId: string): Promise<BuyerDataDeletionSummary> => {
  const client = getClient();
  
  try {
    // Start transaction for data consistency
    const { error: txError } = await client.rpc('begin_transaction');
    if (txError) throw new Error(`Failed to start transaction: ${txError.message}`);
    
    const summary: BuyerDataDeletionSummary = {
      buyerId,
      secretsDeleted: false,
      eventsAnonymized: 0,
      paymentsAnonymized: 0,
      accountDeleted: false,
      completedAt: new Date().toISOString()
    };
    
    // 1. Delete buyer_secrets (encrypted PII - complete removal)
    try {
      await deleteBuyerSecrets(buyerId);
      summary.secretsDeleted = true;
    } catch (error) {
      console.error('Failed to delete buyer secrets:', error);
    }
    
    // 2. Anonymize compliance_events (SET buyer_id = NULL, preserve events)
    try {
      summary.eventsAnonymized = await anonymizeComplianceEvents(buyerId);
    } catch (error) {
      console.error('Failed to anonymize compliance events:', error);
    }
    
    // 3. Anonymize payments (SET buyer_id = NULL, preserve payment history)
    try {
      summary.paymentsAnonymized = await anonymizePayments(buyerId);
    } catch (error) {
      console.error('Failed to anonymize payments:', error);
    }
    
    // 4. Delete buyer_accounts (account removal)
    try {
      await deleteBuyerAccount(buyerId);
      summary.accountDeleted = true;
    } catch (error) {
      console.error('Failed to delete buyer account:', error);
    }
    
    // Commit transaction
    await client.rpc('commit_transaction');
    return summary;
    
  } catch (error) {
    // Rollback on any error
    await client.rpc('rollback_transaction');
    throw new Error(`Failed to delete buyer data: ${error}`);
  }
};

/**
 * Export all buyer data (CCPA "Right to Know")
 * Collects all personal data across tables
 */
export const exportBuyerData = async (buyerId: string): Promise<BuyerDataExport> => {
  // Get buyer account data
  const { data: buyerAccount, error: buyerError } = await getClient()
    .from('buyer_accounts')
    .select('*')
    .eq('id', buyerId)
    .single();
    
  if (buyerError) throw new Error(`Failed to get buyer account: ${buyerError.message}`);
  
  // Get verification history
  const { data: verificationHistory, error: historyError } = await getClient()
    .from('compliance_events')
    .select('*')
    .eq('buyer_id', buyerId);
    
  if (historyError) throw new Error(`Failed to get verification history: ${historyError.message}`);
  
  // Get payment history
  const { data: paymentHistory, error: paymentError } = await getClient()
    .from('payments')
    .select('id, transaction_type, amount_cents, status, payment_timestamp')
    .eq('buyer_id', buyerId);
    
  if (paymentError) throw new Error(`Failed to get payment history: ${paymentError.message}`);
  
  // Note: buyer_secrets are encrypted and cannot be exported
  return {
    buyer_account: buyerAccount,
    verification_history: {
      buyer_id: buyerId,
      buyer_reference_id: buyerAccount.buyer_reference_id,
      total_verifications: verificationHistory?.length || 0,
      verification_events: (verificationHistory || []).map(event => ({
        compliance_event_id: event.id,
        dealer_company_name: undefined, // Would need to join with dealer_accounts
        dealer_reference_id: event.dealer_reference_id,
        age_verified: event.age_verified,
        address_verified: event.address_verified,
        address_match_confidence: 0, // Would extract from verification_data if needed
        verified_at: event.verified_at,
        blockchain_transaction_hash: event.blockchain_info?.transaction_hash
      }))
    },
    payment_history: (paymentHistory || []).map(payment => ({
      payment_id: payment.id,
      amount_cents: payment.amount_cents,
      status: payment.status,
      payment_timestamp: payment.payment_timestamp
    }))
  };
};

/**
 * Validate buyer ownership for CCPA requests
 * Ensures auth user owns the buyer account before data operations
 */
export const validateBuyerOwnership = async (
  authId: string, 
  buyerId: string
): Promise<boolean> => {
  const { data: buyer, error } = await getClient()
    .from('buyer_accounts')
    .select('id')
    .eq('auth_id', authId)
    .eq('id', buyerId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to validate buyer ownership: ${error.message}`);
  }
  return !!buyer;
};