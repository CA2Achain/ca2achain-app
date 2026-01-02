import { z } from 'zod';
import { 
  supabaseAuthUserSchema,
  authLoginSchema, 
  authCallbackSchema,
  authSessionSchema,
  roleSelectionSchema
} from './schema.js';

// Inferred types from schemas
export type SupabaseAuthUser = z.infer<typeof supabaseAuthUserSchema>;
export type AuthLogin = z.infer<typeof authLoginSchema>;
export type AuthCallback = z.infer<typeof authCallbackSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type RoleSelection = z.infer<typeof roleSelectionSchema>;

// User role type
export type UserRole = 'buyer' | 'dealer';

// JWT payload structure (from Supabase)
export interface JWTPayload {
  sub: string; // User ID from Supabase Auth
  email: string;
  aud: string; // Audience
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  iss: string; // Issuer (Supabase)
  role: string; // Supabase role (authenticated, anon, service_role)
  // Custom claims we add via user metadata
  user_role?: UserRole; // buyer or dealer (from user_roles table)
  account_id?: string; // buyer_accounts.id or dealer_accounts.id
}

// Extended auth context for FastifyRequest
export interface AuthContext {
  auth_id: string; // Supabase auth.users.id
  email: string;
  role: UserRole; // buyer or dealer (from user_roles table)
  account_id: string | null; // buyer_accounts.id or dealer_accounts.id (null if not created yet)
}

// API Response types
export interface AuthResponse {
  success: boolean;
  message: string;
  session?: AuthSession;
}

// /auth/me response
export interface AuthMeResponse {
  id: string; // Supabase auth.users.id
  email: string;
  role: UserRole | null; // null if user hasn't selected role yet
  account_data: any | null; // buyer or dealer account data (null if not created)
}

// Magic link response
export interface MagicLinkResponse {
  success: boolean;
  message: string;
  email: string;
}