import { z } from 'zod';

// Buyer registration
export const buyerRegistrationSchema = z.object({
  email: z.string().email(),
});

// Buyer account (public data)
export const buyerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  verification_status: z.enum(['pending', 'verified', 'expired', 'rejected']),
  verified_at: z.string().datetime().optional(),
  verification_expires_at: z.string().datetime().optional(),
  
  // Privado ID integration
  privado_did: z.string().optional(),
  privado_credential_id: z.string().optional(),
  
  // One-time payment
  payment_status: z.enum(['pending', 'paid', 'refunded']),
  stripe_payment_id: z.string().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Privado ID claims structure
export const privadoClaimsSchema = z.object({
  age_over_18: z.boolean(),
  age_over_21: z.boolean(), // AB 1263 may require 21+
  ca_resident: z.boolean(),
  address_verified: z.boolean(),
  dl_verified: z.boolean(),
  verification_date: z.string().datetime(),
  expires_at: z.string().datetime(),
  issuer: z.literal('CA2ACHAIN_LLC'),
});

// Buyer secrets (encrypted vault)
export const buyerSecretsSchema = z.object({
  id: z.string().uuid(),
  buyer_id: z.string().uuid(),
  
  // Encrypted Persona PII
  encrypted_persona_data: z.record(z.string()), // JSONB
  
  // Encrypted Privado ID credential
  encrypted_privado_credential: z.string(),
  
  // Encryption metadata
  encryption_key_id: z.string().uuid(),
  persona_verification_session: z.string(),
  
  created_at: z.string().datetime(),
});