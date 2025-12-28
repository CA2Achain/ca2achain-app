import { z } from 'zod';
import { authAccountSchema, authLoginSchema, authCallbackSchema } from './schema.js';

// Inferred types
export type AuthAccount = z.infer<typeof authAccountSchema>;
export type AuthLogin = z.infer<typeof authLoginSchema>;
export type AuthCallback = z.infer<typeof authCallbackSchema>;

// JWT payload structure for middleware
export interface JWTPayload {
  sub: string; // User ID from Supabase Auth
  email: string;
  account_type: 'buyer' | 'dealer';
  iat: number;
  exp: number;
}

// Extended auth context for FastifyRequest
export interface AuthContext {
  id: string;
  email: string;
  account_type: 'buyer' | 'dealer';
}

// Auth responses
export interface AuthResponse {
  success: boolean;
  message: string;
  email?: string;
  account_type?: 'buyer' | 'dealer';
}

export interface AuthMeResponse {
  id: string;
  email: string;
  account_type: 'buyer' | 'dealer';
  created_at: string;
}