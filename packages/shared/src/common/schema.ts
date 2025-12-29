import { z } from 'zod';

// =============================================
// BASIC STRUCTURES
// =============================================

// Address structure for consistent address handling
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  street_2: z.string().optional(), // Apartment, suite, unit number, etc.
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP code required'),
  country: z.string().default('US'),
});

// Normalized address for comparison purposes
export const normalizedAddressSchema = z.object({
  street_normalized: z.string(), // Standardized street format
  street_2_normalized: z.string().optional(), // Standardized apartment/suite format
  city_normalized: z.string(), // Standardized city format
  state: z.string().length(2), // Always 2-letter state code
  zip_code: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits'), // Always 5-digit ZIP
  country: z.string().default('US'),
});

// Raw address string (for dealer API input)
export const addressStringSchema = z.string().min(10, 'Complete address required');

// =============================================
// ENVIRONMENT CONFIGURATION
// =============================================

export const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  PERSONA_API_KEY: z.string(),
  PERSONA_TEMPLATE_ID: z.string(),
  RESEND_API_KEY: z.string(),
  ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});