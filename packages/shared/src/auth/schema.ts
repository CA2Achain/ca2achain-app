import { z } from 'zod';

// Supabase auth.users table structure (read-only reference)
export const supabaseAuthUserSchema = z.object({
  id: z.string().uuid(), // Supabase Auth user ID
  email: z.string().email(),
  email_confirmed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // Supabase has many other fields, but these are the ones we use
});

// Login request (magic link) - email only
// Role is determined by backend from user_roles table
export const authLoginSchema = z.object({
  email: z.string().email(),
});

// Role selection during registration (Option A flow)
export const roleSelectionSchema = z.object({
  role: z.enum(['buyer', 'dealer']),
});

// Magic link verification callback
export const authCallbackSchema = z.object({
  token: z.string(),
  type: z.literal('magiclink'),
});

// Auth session validation
export const authSessionSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  user: supabaseAuthUserSchema,
});