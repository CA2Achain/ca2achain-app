import { getClient } from './connection.js';

// Get user role by auth_id
export async function getUserRole(authId: string): Promise<string | null> {
  const supabase = getClient();
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_id', authId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - user has no role yet
      return null;
    }
    throw error;
  }
  
  return data?.role || null;
}

// Create user role (only called during registration)
export async function createUserRole(authId: string, role: 'buyer' | 'dealer'): Promise<void> {
  const supabase = getClient();
  
  const { error } = await supabase
    .from('user_roles')
    .insert({
      auth_id: authId,
      role: role
    });
  
  if (error) {
    throw error;
  }
}

// Check if user has a role
export async function hasUserRole(authId: string): Promise<boolean> {
  const role = await getUserRole(authId);
  return role !== null;
}

// Delete user role (for cleanup/admin purposes)
export async function deleteUserRole(authId: string): Promise<void> {
  const supabase = getClient();
  
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('auth_id', authId);
  
  if (error) {
    throw error;
  }
}