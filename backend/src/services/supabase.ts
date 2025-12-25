import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, PIIVault, AuditLog, Customer } from '@ca2achain/shared';

let supabase: SupabaseClient;

export const initSupabase = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
};

export const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabase;
};

// User operations
export const createUser = async (email: string, stripeSessionId?: string) => {
  const { data, error } = await getSupabase()
    .from('users')
    .insert({ email, stripe_verification_session_id: stripeSessionId })
    .select()
    .single();

  if (error) throw error;
  return data as User;
};

export const getUserByEmail = async (email: string) => {
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as User | null;
};

export const getUserById = async (id: string) => {
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as User;
};

// PII Vault operations
export const createPIIRecord = async (piiData: Omit<PIIVault, 'id'>) => {
  const { data, error } = await getSupabase()
    .from('pii_vault')
    .insert(piiData)
    .select()
    .single();

  if (error) throw error;
  return data as PIIVault;
};

export const getPIIByUserId = async (userId: string) => {
  const { data, error } = await getSupabase()
    .from('pii_vault')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as PIIVault | null;
};

export const deletePIIByUserId = async (userId: string) => {
  const { error } = await getSupabase()
    .from('pii_vault')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

// Audit log operations
export const createAuditLog = async (auditData: Omit<AuditLog, 'id' | 'timestamp'>) => {
  const { data, error } = await getSupabase()
    .from('audit_logs')
    .insert(auditData)
    .select()
    .single();

  if (error) throw error;
  return data as AuditLog;
};

export const getAuditLogsByUserId = async (userId: string) => {
  const { data, error } = await getSupabase()
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data as AuditLog[];
};

// Customer operations
export const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await getSupabase()
    .from('customers')
    .insert(customerData)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
};

export const getCustomerByApiKeyHash = async (apiKeyHash: string) => {
  const { data, error } = await getSupabase()
    .from('customers')
    .select('*')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Customer | null;
};

export const getCustomerById = async (id: string) => {
  const { data, error } = await getSupabase()
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Customer;
};

export const incrementCustomerQueryCount = async (customerId: string) => {
  const { data, error } = await getSupabase()
    .rpc('increment_query_count', { customer_id: customerId });

  if (error) throw error;
  return data;
};

export const resetCustomerQueryCount = async (customerId: string) => {
  const { error } = await getSupabase()
    .from('customers')
    .update({ 
      queries_used_this_month: 0,
      billing_period_start: new Date().toISOString(),
      billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', customerId);

  if (error) throw error;
};