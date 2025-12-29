import { z } from 'zod';

// Buyer registration schema (for initial account creation)
export const buyerRegistrationSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required').optional(),
});

// Complete buyer account database entity schema
export const buyerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(), // References auth.users(id) - Supabase auth
  
  // Basic contact info
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  
  // Verification status
  verification_status: z.enum(['pending', 'verified', 'expired', 'rejected']).default('pending'),
  verified_at: z.string().datetime().optional(),
  verification_expires_at: z.string().datetime().optional(),
  
  // Privado ID integration
  privado_did: z.string().optional(),
  privado_credential_id: z.string().optional(),
  
  // One-time payment
  payment_status: z.enum(['pending', 'paid', 'refunded']).default('pending'),
  stripe_payment_id: z.string().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Privado ID credential claims structure
export const privadoClaimsSchema = z.object({
  age_over_18: z.boolean(),
  age_over_21: z.boolean(),
  ca_resident: z.boolean(),
  address_verified: z.boolean(),
  dl_verified: z.boolean(),
  verification_date: z.string().datetime(),
  expires_at: z.string().datetime(),
  issuer: z.literal('CA2ACHAIN_LLC'),
});

// Buyer secrets (encrypted PII vault) database entity schema
export const buyerSecretsSchema = z.object({
  id: z.string().uuid(),
  buyer_id: z.string().uuid(), // References buyer_accounts.id
  
  // Encrypted Persona PII
  encrypted_persona_data: z.record(z.string()),
  
  // Encrypted Privado ID credential  
  encrypted_privado_credential: z.string(),
  
  // Encryption metadata
  encryption_key_id: z.string().uuid(),
  persona_verification_session: z.string(),
  
  created_at: z.string().datetime(),
});

// NEW: Buyer profile update schema (for account management)
export const buyerProfileUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
});

// NEW: CCPA data request schema
export const buyerDataRequestSchema = z.object({
  request_type: z.enum(['export', 'delete_data', 'delete_account'], {
    errorMap: () => ({ message: 'Request type must be export, delete_data, or delete_account' })
  })
});