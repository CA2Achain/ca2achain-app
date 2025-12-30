import { getClient } from './database/connection.js';
import { getBuyerByAuth } from './database/buyer-accounts.js';
import { getDealerByAuth } from './database/dealer-accounts.js';

// Send magic link for passwordless login
export const sendMagicLink = async (
  email: string, 
  accountType?: 'buyer' | 'dealer',
  redirectTo?: string
) => {
  const supabase = getClient();
  
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

// Verify OTP token
export const verifyOtp = async (email: string, token: string) => {
  const supabase = getClient();
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw error;
  return data;
};

// Get user from JWT token and include account data
export const getUserFromToken = async (accessToken: string) => {
  const supabase = getClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) throw error;
  if (!user) throw new Error('User not found');
  
  // Try to find buyer account first
  let accountData = await getBuyerByAuth(user.id);
  if (accountData) {
    return {
      supabaseUser: user,
      accountType: 'buyer' as const,
      account: accountData
    };
  }
  
  // Try dealer account
  accountData = await getDealerByAuth(user.id);
  if (accountData) {
    return {
      supabaseUser: user,
      accountType: 'dealer' as const,
      account: accountData
    };
  }
  
  // User exists in auth but no account created yet
  return {
    supabaseUser: user,
    accountType: null,
    account: null
  };
};

// Ensure auth account exists (simplified - accounts link to auth.users directly)
export const ensureAuthAccountExists = async (supabaseUser: any) => {
  // In our new structure, buyer/dealer accounts are created separately
  // and link to auth.users via auth_id foreign key
  // This function just returns the auth user info
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    email_confirmed: supabaseUser.email_confirmed_at !== null,
    account_type: supabaseUser.user_metadata?.account_type || null
  };
};

// Sign out
export const signOut = async () => {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Update user metadata
export const updateUserMetadata = async (userId: string, metadata: Record<string, any>) => {
  const supabase = getClient();
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) throw error;
  return data;
};

// Delete user (cascades to buyer/dealer accounts via foreign key)
export const deleteUser = async (userId: string) => {
  const supabase = getClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
};