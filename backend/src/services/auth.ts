import { getClient } from './database/connection.js';
import { getBuyerByAuth } from './database/buyer-accounts.js';
import { getDealerByAuth } from './database/dealer-accounts.js';
import { getUserRole, createUserRole } from './database/user-roles.js';
import type { BuyerAccount, DealerAccount } from '@ca2achain/shared';

// Register new user with role (creates auth.users + user_roles entry, then sends OTP)
export const registerUser = async (email: string, role: 'buyer' | 'dealer') => {
  const supabase = getClient();
  
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers?.users?.some(u => u.email === email);
  
  if (userExists) {
    throw new Error('User already exists. Please use login instead.');
  }
  
  // Create auth user with admin API (generates random password, user will use OTP)
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false, // User must verify via OTP
    user_metadata: { role } // Store role in metadata as backup
  });

  if (createError) throw createError;
  if (!newUser.user) throw new Error('Failed to create user');

  // Create user_roles entry immediately
  await createUserRole(newUser.user.id, role);

  // Now send OTP for email verification
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { role }
    }
  });

  if (error) throw error;
  
  return data;
};

// Send OTP for login (existing users only)
export const sendLoginOtp = async (email: string) => {
  const supabase = getClient();
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email
  });

  if (error) throw error;
  return data;
};

// Verify OTP and return user with role
export const verifyOtp = async (email: string, token: string) => {
  const supabase = getClient();
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw error;
  
  if (!data.user) {
    throw new Error('Verification failed');
  }
  
  return data;
};

// Get user from JWT token with role and account data
export const getUserFromToken = async (accessToken: string) => {
  const supabase = getClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) throw error;
  if (!user) throw new Error('User not found');
  
  // Get role from user_roles table
  const role = await getUserRole(user.id);
  
  // Get account data based on role
  let accountData = null;
  if (role === 'buyer') {
    accountData = await getBuyerByAuth(user.id);
  } else if (role === 'dealer') {
    accountData = await getDealerByAuth(user.id);
  }
  
  return {
    supabaseUser: user,
    role: role,
    account: accountData
  };
};

// Sign out
export const signOut = async () => {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Delete user (cascades to buyer/dealer accounts via foreign key)
export const deleteUser = async (userId: string) => {
  const supabase = getClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
};