import { getClient } from './connection.js';
import type { 
  BuyerRegistration, 
  BuyerAccount, 
  BuyerVerificationStatus 
} from '@ca2achain/shared';

/**
 * Create a new buyer account
 */
export const createBuyer = async (
  authId: string, 
  data: BuyerRegistration
): Promise<BuyerAccount> => {
  const { data: buyer, error } = await getClient()
    .from('buyer_accounts')
    .insert({
      auth_id: authId,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      verification_status: 'pending',
      payment_status: 'pending'
    })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create buyer account: ${error.message}`);
  return buyer;
};

/**
 * Get buyer account by auth ID (for login)
 */
export const getBuyerByAuth = async (authId: string): Promise<BuyerAccount | null> => {
  const { data: buyer, error } = await getClient()
    .from('buyer_accounts')
    .select('*')
    .eq('auth_id', authId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer by auth: ${error.message}`);
  }
  return buyer || null;
};

/**
 * Get buyer account by ID
 */
export const getBuyerById = async (id: string): Promise<BuyerAccount | null> => {
  const { data: buyer, error } = await getClient()
    .from('buyer_accounts')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer by ID: ${error.message}`);
  }
  return buyer || null;
};

/**
 * Update buyer account (partial update with object in memory)
 */
export const updateBuyerAccount = async (
  id: string, 
  data: Partial<BuyerAccount>
): Promise<boolean> => {
  const { error } = await getClient()
    .from('buyer_accounts')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw new Error(`Failed to update buyer account: ${error.message}`);
  return true;
};

/**
 * Update buyer verification status
 */
export const setBuyerVerificationStatus = async (
  id: string,
  status: BuyerVerificationStatus,
  verificationId?: string
): Promise<boolean> => {
  const updateData: any = {
    verification_status: status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'verified') {
    updateData.verified_at = new Date().toISOString();
    updateData.current_verification_id = verificationId;
  }
  
  const { error } = await getClient()
    .from('buyer_accounts')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw new Error(`Failed to update buyer verification status: ${error.message}`);
  return true;
};

/**
 * Delete buyer account (CCPA compliance)
 */
export const deleteBuyerAccount = async (id: string): Promise<boolean> => {
  const { error } = await getClient()
    .from('buyer_accounts')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(`Failed to delete buyer account: ${error.message}`);
  return true;
};