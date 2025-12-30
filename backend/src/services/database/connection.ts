import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

/**
 * Initialize Supabase client with service role key
 */
export const initSupabase = (): void => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Get the initialized Supabase client
 */
export const getClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Call initSupabase() first.');
  }
  return supabase;
};

/**
 * Basic health check for database connection
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const { error } = await getClient().from('buyer_accounts').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};