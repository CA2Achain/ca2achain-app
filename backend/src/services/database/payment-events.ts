import { getClient } from './connection.js';
import type { 
  Payment,
  CreatePayment,
  PaymentStatus 
} from '@ca2achain/shared';

/**
 * Create payment event (immutable event log)
 * Created with final status and complete provider info
 */
export const createPaymentEvent = async (data: CreatePayment): Promise<Payment> => {
  const { data: payment, error } = await getClient()
    .from('payments')
    .insert({
      buyer_id: data.buyer_id,
      dealer_id: data.dealer_id,
      transaction_type: data.transaction_type,
      amount_cents: data.amount_cents,
      status: 'pending', // Will be updated via webhook
      customer_reference_id: data.customer_reference_id,
      payment_provider_info: data.payment_provider_info
    })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create payment event: ${error.message}`);
  return payment;
};

/**
 * Update payment status (only for webhook status updates)
 * This is the only mutable operation on payments
 */
export const updatePaymentStatus = async (
  id: string, 
  status: PaymentStatus,
  providerInfo?: Record<string, any>
): Promise<boolean> => {
  const updateData: any = { status };
  if (providerInfo) {
    updateData.payment_provider_info = providerInfo;
  }
  
  const { error } = await getClient()
    .from('payments')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw new Error(`Failed to update payment status: ${error.message}`);
  return true;
};

/**
 * Get payment history for buyer
 */
export const getBuyerPaymentHistory = async (buyerId: string): Promise<Payment[]> => {
  const { data: payments, error } = await getClient()
    .from('payments')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('payment_timestamp', { ascending: false });
    
  if (error) throw new Error(`Failed to get buyer payment history: ${error.message}`);
  return payments || [];
};

/**
 * Get payment history for dealer
 */
export const getDealerPaymentHistory = async (dealerId: string): Promise<Payment[]> => {
  const { data: payments, error } = await getClient()
    .from('payments')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('payment_timestamp', { ascending: false });
    
  if (error) throw new Error(`Failed to get dealer payment history: ${error.message}`);
  return payments || [];
};

/**
 * Anonymize payment events for buyer (CCPA compliance)
 * Sets buyer_id to NULL while preserving payment history
 */
export const anonymizePayments = async (buyerId: string): Promise<number> => {
  const { data, error } = await getClient()
    .from('payments')
    .update({ buyer_id: null })
    .eq('buyer_id', buyerId)
    .select('id');
    
  if (error) throw new Error(`Failed to anonymize payments: ${error.message}`);
  return data?.length || 0;
};