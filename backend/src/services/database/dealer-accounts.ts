import { getClient } from './connection.js';
import type { DealerRegistration, DealerProfileUpdate, DealerAccount } from '@ca2achain/shared';

// Create new dealer account - NO payment/subscription/API key
export const createDealer = async (
  authId: string, 
  data: DealerRegistration
): Promise<DealerAccount> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .insert({
      auth_id: authId,
      company_name: data.company_name,
      business_email: data.business_email,
      business_address: data.business_address,
      business_phone: data.business_phone,
      // All payment/subscription fields are NULL by default
      api_key_hash: null,
      subscription_tier: null,
      subscription_status: null,
      credits_purchased: null,
      additional_credits_purchased: null,
      credits_used: null
    })
    .select()
    .single();

  if (error) {
    console.error('Create dealer error:', error);
    throw error;
  }

  return dealer as DealerAccount;
};

// Get dealer by auth_id
export const getDealerByAuth = async (authId: string): Promise<DealerAccount | null> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return dealer as DealerAccount;
};

// Get dealer by API key hash
export const getDealerByApiKey = async (apiKeyHash: string): Promise<DealerAccount | null> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return dealer as DealerAccount;
};

// Update dealer account
export const updateDealerAccount = async (
  dealerId: string, 
  updates: Partial<DealerProfileUpdate>
): Promise<DealerAccount> => {
  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', dealerId)
    .select()
    .single();

  if (error) throw error;
  return dealer as DealerAccount;
};

// Setup subscription (future implementation - creates API key)
export const setupDealerSubscription = async (
  dealerId: string,
  subscriptionTier: number,
  apiKeyHash: string
): Promise<DealerAccount> => {
  // Calculate credits based on tier
  const tierCredits = {
    1: 100,   // Tier 1: 100 verifications/month
    2: 500,   // Tier 2: 500 verifications/month
    3: 10000  // Tier 3: Unlimited (large number)
  };

  const { data: dealer, error } = await getClient()
    .from('dealer_accounts')
    .update({
      subscription_tier: subscriptionTier,
      subscription_status: 'active',
      api_key_hash: apiKeyHash,
      api_key_created_at: new Date().toISOString(),
      credits_purchased: tierCredits[subscriptionTier as keyof typeof tierCredits],
      additional_credits_purchased: 0,
      credits_used: 0,
      billing_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', dealerId)
    .select()
    .single();

  if (error) throw error;
  return dealer as DealerAccount;
};

// Use dealer credit (returns boolean for success)
export const useDealerCredit = async (dealerId: string): Promise<boolean> => {
  try {
    const { data: dealer, error: getError } = await getClient()
      .from('dealer_accounts')
      .select('credits_purchased, additional_credits_purchased, credits_used')
      .eq('id', dealerId)
      .single();

    if (getError) throw getError;
    
    // Check if credits are null (no subscription)
    if (dealer.credits_purchased === null) return false;

    const availableCredits = (dealer.credits_purchased + (dealer.additional_credits_purchased || 0)) - dealer.credits_used;
    
    if (availableCredits <= 0) return false;

    const { error: updateError } = await getClient()
      .from('dealer_accounts')
      .update({ 
        credits_used: dealer.credits_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealerId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Use dealer credit error:', error);
    return false;
  }
};

// Add dealer credits
export const addDealerCredits = async (
  dealerId: string, 
  amount: number
): Promise<DealerAccount> => {
  const { data: dealer, error: getError } = await getClient()
    .from('dealer_accounts')
    .select('additional_credits_purchased')
    .eq('id', dealerId)
    .single();

  if (getError) throw getError;

  const { data: updatedDealer, error: updateError } = await getClient()
    .from('dealer_accounts')
    .update({ 
      additional_credits_purchased: (dealer.additional_credits_purchased || 0) + amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', dealerId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedDealer as DealerAccount;
};