import { getClient } from './database/connection.js';
import { getBuyerByAuth } from './database/buyer-accounts.js';
import { getDealerByAuth } from './database/dealer-accounts.js';
import { getUserRole, createUserRole, hasUserRole } from './database/user-roles.js';
import type { BuyerAccount, DealerAccount } from '@ca2achain/shared';

// Check if user exists in BOTH auth.users AND user_roles (must be synced)
async function userExists(email: string): Promise<{ exists: boolean; userId?: string; hasRole?: boolean }> {
  const supabase = getClient();
  
  // Check auth.users by listing all users and filtering by email
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUser = usersData?.users?.find(u => u.email === email);
  
  if (!existingUser) {
    return { exists: false };
  }
  
  // Check user_roles
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
  
  // Step 1: Check if user already exists in auth.users OR user_roles
  const existingUser = await userExists(email);
  
  if (existingUser.exists) {
    // User exists - they should use login instead
    throw new Error('EXISTING_USER');
  }

  // Step 2: Create auth user (creates entry in auth.users)
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false, // Must verify via magic link
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
    // Step 3: Create user_roles entry (synced with auth.users)
    await createUserRole(newUser.user.id, role);

    // Step 4: Send magic link via signInWithOtp
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // User already created
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (otpError) {
      console.error('Send magic link error:', otpError);
      throw new Error('Failed to send verification email');
    }

    return { success: true };

  } catch (error) {
    // Cleanup: Delete auth user if role creation or email fails
    console.error('Registration error, cleaning up:', error);
    try {
      await supabase.auth.admin.deleteUser(newUser.user.id);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    throw error;
  }
};

// Send OTP for login (existing users only)
export const sendLoginOtp = async (email: string) => {
  const supabase = getClient();
  
  // Check if user exists
  const existingUser = await userExists(email);
  
  if (!existingUser.exists) {
    throw new Error('USER_NOT_FOUND');
  }

  // Check if user has role (both tables must be synced)
  if (!existingUser.hasRole) {
    // User exists in auth.users but not in user_roles - data corruption
    console.error('User exists in auth.users but not in user_roles:', email);
    throw new Error('Account setup incomplete. Please contact support.');
  }

  // Send OTP
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false
    }
  });

  if (error) {
    console.error('Send OTP error:', error);
    throw new Error('Failed to send verification code');
  }

  return { success: true };
};

// Verify OTP and return session
export const verifyOtp = async (email: string, token: string) => {
  const supabase = getClient();
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }
  
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