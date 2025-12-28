import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AuthAccount, 
  BuyerAccount, 
  DealerAccount, 
  BuyerSecrets,
  ComplianceEvent 
} from '@ca2achain/shared';

let supabase: SupabaseClient;

// Initialize Supabase client
export const initSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Get Supabase client instance
export const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabase;
};

// =============================================
// AUTH ACCOUNTS (Shared buyer/dealer auth)
// =============================================

export const createAuthAccount = async (data: {
  id: string; // From Supabase Auth
  email: string;
  account_type: 'buyer' | 'dealer';
}): Promise<AuthAccount> => {
  const { data: authAccount, error } = await supabase
    .from('auth_accounts')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create auth account: ${error.message}`);
  return authAccount;
};

export const getAuthAccountById = async (id: string): Promise<AuthAccount | null> => {
  const { data, error } = await supabase
    .from('auth_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get auth account: ${error.message}`);
  }
  return data;
};

export const getAuthAccountByEmail = async (email: string): Promise<AuthAccount | null> => {
  const { data, error } = await supabase
    .from('auth_accounts')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get auth account: ${error.message}`);
  }
  return data;
};

// =============================================
// BUYER ACCOUNTS
// =============================================

export const createBuyerAccount = async (data: {
  auth_id: string;
  verification_status?: 'pending' | 'verified' | 'expired' | 'rejected';
  payment_status: 'pending' | 'paid' | 'refunded';
  stripe_payment_id?: string;
}): Promise<BuyerAccount> => {
  const { data: buyer, error } = await supabase
    .from('buyer_accounts')
    .insert({
      ...data,
      verification_status: data.verification_status || 'pending'
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create buyer account: ${error.message}`);
  return buyer;
};

export const getBuyerById = async (id: string): Promise<BuyerAccount | null> => {
  const { data, error } = await supabase
    .from('buyer_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer: ${error.message}`);
  }
  return data;
};

export const getBuyerByAuthId = async (authId: string): Promise<BuyerAccount | null> => {
  const { data, error } = await supabase
    .from('buyer_accounts')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer by auth ID: ${error.message}`);
  }
  return data;
};

export const getBuyerByEmail = async (email: string): Promise<BuyerAccount | null> => {
  const { data, error } = await supabase
    .from('buyer_accounts')
    .select(`
      *,
      auth_accounts!inner(email)
    `)
    .eq('auth_accounts.email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer by email: ${error.message}`);
  }
  return data;
};

export const updateBuyerAccount = async (id: string, updates: Partial<BuyerAccount>): Promise<BuyerAccount> => {
  const { data, error } = await supabase
    .from('buyer_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update buyer account: ${error.message}`);
  return data;
};

// =============================================
// BUYER SECRETS (Encrypted PII)
// =============================================

export const createBuyerSecrets = async (data: {
  buyer_id: string;
  encrypted_persona_data: Record<string, string>;
  encrypted_privado_credential: string;
  encryption_key_id: string;
  persona_verification_session?: string;
}): Promise<BuyerSecrets> => {
  const { data: secrets, error } = await supabase
    .from('buyer_secrets')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create buyer secrets: ${error.message}`);
  return secrets;
};

export const getBuyerSecrets = async (buyerId: string): Promise<BuyerSecrets | null> => {
  const { data, error } = await supabase
    .from('buyer_secrets')
    .select('*')
    .eq('buyer_id', buyerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer secrets: ${error.message}`);
  }
  return data;
};

export const deleteBuyerSecrets = async (buyerId: string): Promise<void> => {
  const { error } = await supabase
    .from('buyer_secrets')
    .delete()
    .eq('buyer_id', buyerId);

  if (error) throw new Error(`Failed to delete buyer secrets: ${error.message}`);
};

// =============================================
// DEALER ACCOUNTS
// =============================================

export const createDealerAccount = async (data: {
  auth_id: string;
  company_name: string;
  api_key_hash: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
  monthly_query_limit: number;
  billing_period_start: string;
  billing_period_end: string;
}): Promise<DealerAccount> => {
  const { data: dealer, error } = await supabase
    .from('dealer_accounts')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create dealer account: ${error.message}`);
  return dealer;
};

export const getDealerById = async (id: string): Promise<DealerAccount | null> => {
  const { data, error } = await supabase
    .from('dealer_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get dealer: ${error.message}`);
  }
  return data;
};

export const getDealerByAuthId = async (authId: string): Promise<DealerAccount | null> => {
  const { data, error } = await supabase
    .from('dealer_accounts')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get dealer by auth ID: ${error.message}`);
  }
  return data;
};

export const getDealerByApiKeyHash = async (apiKeyHash: string): Promise<DealerAccount | null> => {
  const { data, error } = await supabase
    .from('dealer_accounts')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get dealer by API key: ${error.message}`);
  }
  return data;
};

export const updateDealerAccount = async (id: string, updates: Partial<DealerAccount>): Promise<DealerAccount> => {
  const { data, error } = await supabase
    .from('dealer_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update dealer account: ${error.message}`);
  return data;
};

export const incrementDealerQueryCount = async (dealerId: string): Promise<void> => {
  const { error } = await supabase
    .rpc('increment_dealer_query_count', { dealer_uuid: dealerId });

  if (error) throw new Error(`Failed to increment query count: ${error.message}`);
};

// =============================================
// COMPLIANCE EVENTS
// =============================================

export const createComplianceEvent = async (data: {
  verification_id: string;
  buyer_id: string;
  dealer_id: string;
  dealer_request: Record<string, any>;
  privado_proofs: Record<string, any>;
  compliance_attestation: Record<string, any>;
  blockchain_status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  verification_result: 'PASS' | 'FAIL';
  age_verified: boolean;
  address_verified: boolean;
  confidence_score: number;
}): Promise<ComplianceEvent> => {
  const { data: event, error } = await supabase
    .from('compliance_events')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create compliance event: ${error.message}`);
  return event;
};

export const getComplianceEventById = async (id: string): Promise<ComplianceEvent | null> => {
  const { data, error } = await supabase
    .from('compliance_events')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get compliance event: ${error.message}`);
  }
  return data;
};

export const getComplianceEventByVerificationId = async (verificationId: string): Promise<ComplianceEvent | null> => {
  const { data, error } = await supabase
    .from('compliance_events')
    .select('*')
    .eq('verification_id', verificationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get compliance event: ${error.message}`);
  }
  return data;
};

export const getBuyerAuditLogs = async (buyerId: string) => {
  const { data, error } = await supabase
    .rpc('get_buyer_audit_logs', { buyer_uuid: buyerId });

  if (error) throw new Error(`Failed to get audit logs: ${error.message}`);
  return data;
};

export const updateComplianceEvent = async (id: string, updates: Partial<ComplianceEvent>): Promise<ComplianceEvent> => {
  const { data, error } = await supabase
    .from('compliance_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update compliance event: ${error.message}`);
  return data;
};