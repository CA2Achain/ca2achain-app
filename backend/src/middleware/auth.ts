import { getSupabase } from './supabase.js';

// Send magic link for passwordless login
export const sendMagicLink = async (email: string, redirectTo?: string) => {
  const { data, error } = await getSupabase().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};

// Verify OTP token
export const verifyOtp = async (email: string, token: string) => {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async (accessToken: string) => {
  const { error } = await getSupabase().auth.admin.signOut(accessToken);
  if (error) throw error;
};

// Get user from token
export const getUserFromToken = async (accessToken: string) => {
  const { data: { user }, error } = await getSupabase().auth.getUser(accessToken);
  
  if (error) throw error;
  return user;
};

// Update user metadata
export const updateUserMetadata = async (userId: string, metadata: Record<string, any>) => {
  const { data, error } = await getSupabase().auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) throw error;
  return data;
};

// Delete user
export const deleteUser = async (userId: string) => {
  const { error } = await getSupabase().auth.admin.deleteUser(userId);
  if (error) throw error;
};