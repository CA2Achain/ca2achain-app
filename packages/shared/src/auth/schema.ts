import { z } from 'zod';

// Shared authentication table for both buyers and dealers
export const authAccountSchema = z.object({
  id: z.string().uuid(), // References Supabase Auth user ID
  email: z.string().email(),
  account_type: z.enum(['buyer', 'dealer']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Login/registration requests
export const authLoginSchema = z.object({
  email: z.string().email(),
  account_type: z.enum(['buyer', 'dealer']).optional(), // For registration
});

// Magic link verification
export const authCallbackSchema = z.object({
  token: z.string(),
  type: z.literal('magiclink'),
});