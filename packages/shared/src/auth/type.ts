import { z } from 'zod';
import { 
  supabaseAuthUserSchema,
  authLoginSchema, 
  authCallbackSchema,
  authSessionSchema
} from './schema.js';

// Inferred types from schemas
export type SupabaseAuthUser = z.infer<typeof supabaseAuthUserSchema>;
export type AuthLogin = z.infer<typeof authLoginSchema>;
export type AuthCallback = z.infer<typeof authCallbackSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;

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
  account_type?: 'buyer' | 'dealer';
  account_id?: string; // buyer_accounts.id or dealer_accounts.id
}

// Extended auth context for FastifyRequest
export interface AuthContext {
  auth_id: string; // Supabase auth.users.id
  email: string;
  account_type: 'buyer' | 'dealer';
  account_id: string; // buyer_accounts.id or dealer_accounts.id
}

// API Response types
export interface AuthResponse {
  success: boolean;
  message: string;
  session?: AuthSession;
}

export interface AuthMeResponse {
  auth_id: string; // Supabase auth.users.id
  email: string;
  account_type: 'buyer' | 'dealer';
  account_id: string; // Actual buyer/dealer account ID
  created_at: string;
}

// Magic link response
export interface MagicLinkResponse {
  success: boolean;
  message: string;
  email: string;
}