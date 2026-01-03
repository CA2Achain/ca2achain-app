import { getClient } from './database/connection.js';
import { getBuyerByAuth } from './database/buyer-accounts.js';
import { getDealerByAuth } from './database/dealer-accounts.js';
import { getUserRole, createUserRole, hasUserRole } from './database/user-roles.js';
import type { BuyerAccount, DealerAccount } from '@ca2achain/shared';

// Check if user exists in BOTH auth.users AND user_roles (must be synced)
async function userExists(email: string): Promise<{ exists: boolean; userId?: string; hasRole?: boolean }> {
  const supabase = getClient();
  
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUser = usersData?.users?.find(u => u.email === email);
  
  if (!existingUser) {
    return { exists: false };
  }
  
  const hasRole = await hasUserRole(existingUser.id);
  
  return { 
    exists: true, 
    userId: existingUser.id,
    hasRole 
  };
}

// Register new user with magic link
export const registerUser = async (email: string, role: 'buyer' | 'dealer') => {
  const supabase = getClient();
  
  const existingUser = await userExists(email);
  
  if (existingUser.exists) {
    throw new Error('EXISTING_USER');
  }

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { role }
  });

  if (createError) {
    console.error('Create user error:', createError);
    throw new Error('Failed to create user account');
  }
  
  if (!newUser.user) {
    throw new Error('Failed to create user account');
  }

  try {
    await createUserRole(newUser.user.id, role);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (otpError) {
      console.error('Send magic link error:', otpError);
      throw new Error('Failed to send verification email');
    }

    console.log(`Magic link sent to ${email} for new ${role} account`);
    return { success: true };

  } catch (error) {
    console.error('Registration error, cleaning up:', error);
    try {
      await supabase.auth.admin.deleteUser(newUser.user.id);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    throw error;
  }
};

// Send magic link for login (CHANGED: use magic link instead of OTP)
export const sendLoginLink = async (email: string) => {
  const supabase = getClient();
  
  const existingUser = await userExists(email);
  
  if (!existingUser.exists) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!existingUser.hasRole) {
    console.error('User exists in auth.users but not in user_roles:', email);
    throw new Error('Account setup incomplete. Please contact support.');
  }

  // Send MAGIC LINK instead of OTP code
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
    }
  });

  if (error) {
    console.error('Send magic link error:', error);
    throw new Error('Failed to send verification link');
  }

  console.log(`Magic link sent to ${email} for login`);
  return { success: true };
};

// Get user from JWT token with role and account data
export const getUserFromToken = async (accessToken: string) => {
  const supabase = getClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) throw error;
  if (!user) throw new Error('User not found');
  
  const role = await getUserRole(user.id);
  
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

// Delete user
export const deleteUser = async (userId: string) => {
  const supabase = getClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
};