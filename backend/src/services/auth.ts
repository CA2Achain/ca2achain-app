import { getSupabase, createAuthAccount, getAuthAccountByEmail } from './supabase.js';

// Send magic link for passwordless login
export const sendMagicLink = async (
  email: string, 
  accountType?: 'buyer' | 'dealer',
  redirectTo?: string
) => {
  const supabase = getSupabase();
  
  // Set user metadata for new users
  const options = accountType ? {
    data: { account_type: accountType }
  } : {};
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      ...options,
      emailRedirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};

// Verify OTP token and ensure auth_account exists
export const verifyOtp = async (email: string, token: string) => {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw error;
  
  // Ensure auth_account record exists
  if (data.user) {
    await ensureAuthAccountExists(data.user);
  }
  
  return data;
};

// Ensure auth_account record exists for Supabase Auth user
export const ensureAuthAccountExists = async (supabaseUser: any) => {
  let authAccount = await getAuthAccountByEmail(supabaseUser.email);
  
  if (!authAccount) {
    // Create auth_account record
    const accountType = supabaseUser.user_metadata?.account_type || 'buyer';
    
    authAccount = await createAuthAccount({
      id: supabaseUser.id,
      email: supabaseUser.email,
      account_type: accountType
    });
  }
  
  return authAccount;
};

// Get current user from token
export const getUserFromToken = async (accessToken: string) => {
  const supabase = getSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) throw error;
  if (!user) throw new Error('User not found');
  
  // Get auth_account record
  const authAccount = await getAuthAccountByEmail(user.email!);
  if (!authAccount) {
    throw new Error('Auth account not found');
  }
  
  return { supabaseUser: user, authAccount };
};

// Sign out
export const signOut = async (accessToken: string) => {
  const { error } = await getSupabase().auth.admin.signOut(accessToken);
  if (error) throw error;
};

// Update user metadata
export const updateUserMetadata = async (userId: string, metadata: Record<string, any>) => {
  const { data, error } = await getSupabase().auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) throw error;
  return data;
};

// Delete user (cascades to auth_accounts)
export const deleteUser = async (userId: string) => {
  const { error } = await getSupabase().auth.admin.deleteUser(userId);
  if (error) throw error;
};