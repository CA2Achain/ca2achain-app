import { getClient } from './connection.js';
import type { 
  DealerRegistration, 
  DealerAccount,
  PaymentInfo 
} from '@ca2achain/shared';

/**
 * Create a new dealer account
 */
export const createDealer = async (
  authId: string, 
  data: DealerRegistration,
  apiKeyHash: string
): Promise<DealerAccount> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .insert({
      auth_id: authId,
      company_name: data.company_name,
      business_email: data.business_email,
      business_address: data.business_address,
      business_phone: data.business_phone,
      subscription_tier: data.subscription_tier,
      subscription_status: 'trialing',
      api_key_hash: apiKeyHash,
      credits_purchased: 100, // Default tier 1 credits
      credits_used: 0,
      additional_credits_purchased: 0
    })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create dealer account: ${error.message}`);
  return dealer;
};

/**
 * Get dealer account by auth ID (for login)
 */
export const getDealerByAuth = async (authId: string): Promise<DealerAccount | null> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .select('*')
    .eq('auth_id', authId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get dealer by auth: ${error.message}`);
  }
  return dealer || null;
};

/**
 * Get dealer account by API key (for verification requests)
 */
export const getDealerByApiKey = async (apiKeyHash: string): Promise<DealerAccount | null> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get dealer by API key: ${error.message}`);
  }
  return dealer || null;
};

/**
 * Update dealer account (partial update with object in memory)
 */
export const updateDealerAccount = async (
  id: string, 
  data: Partial<DealerAccount>
): Promise<boolean> => {
  const { error } = await getClient()
    .from('dealer_accounts')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw new Error(`Failed to update dealer account: ${error.message}`);
  return true;
};

/**
 * Use dealer credit (atomic operation for API requests)
 * Checks availability and decrements in single operation
 */
export const useDealerCredit = async (dealerId: string): Promise<boolean> => {
  const { data, error } = await getClient()
    .rpc('use_dealer_credit', { dealer_uuid: dealerId });
    
  if (error) throw new Error(`Failed to use dealer credit: ${error.message}`);
  return data === true;
};

/**
 * Add credits to dealer account (for billing/purchases)
 */
export const addDealerCredits = async (dealerId: string, credits: number): Promise<boolean> => {
  const { data, error } = await getClient()
    .rpc('add_dealer_credits', { 
      dealer_uuid: dealerId, 
      credit_amount: credits 
    });
    
  if (error) throw new Error(`Failed to add dealer credits: ${error.message}`);
  return data === true;
};

/**
 * Delete dealer account (CCPA compliance)
 */
export const deleteDealerAccount = async (id: string): Promise<boolean> => {
  const { error } = await getClient()
    .from('dealer_accounts')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(`Failed to delete dealer account: ${error.message}`);
  return true;
};