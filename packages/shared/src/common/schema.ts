import { z } from 'zod';

// =============================================
// BASIC STRUCTURES
// =============================================

// Email validation
export const emailSchema = z.string().email('Valid email address required');

// Phone number validation (US format)
export const phoneNumberSchema = z.string()
  .regex(/^\+?1?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, 'Valid US phone number required')
  .transform(phone => phone.replace(/\D/g, '').replace(/^1/, '')); // Normalize to 10 digits

// Date of birth validation
export const dateOfBirthSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(date => {
    const parsedDate = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - parsedDate.getFullYear();
    return age >= 0 && age <= 120; // Reasonable age range
  }, 'Invalid date of birth');

// Standard timestamp format (ISO 8601)
export const timestampSchema = z.string().datetime();

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
// PAYMENT DATA STRUCTURES
// =============================================

// Payment status enum - UPDATED for 2+1 safe capture flow
export const paymentStatusSchema = z.enum([
  'pending',                    // Not yet processed
  'authorized',                 // NEW: Payment authorized, funds held (manual capture mode)
  'id_check_started',           // NEW: ID verification started
  'id_check_passed',            // NEW: ID verification passed
  'succeeded',                  // Old status (for backward compat) - means completed
  'completed',                  // NEW: Payment captured, fully verified
  'failed',                     // Payment failed
  'authorized_refunded',        // NEW: Authorized hold released (no charge)
  'completed_refunded',         // Captured payment refunded
  'refunded',                   // Old status (for backward compat)
  'error'                       // Error state
]);

// Credit card info (display purposes only - no sensitive data)
export const creditCardInfoSchema = z.object({
  method: z.literal('card'),
  last4: z.string().length(4).optional(), // Last 4 digits for display
  brand: z.string().optional(), // visa, mastercard, etc.
  billing_name: z.string().optional(),
});

// Stripe integration info (secure tokens only)
// NEW: Added error_message for payment error tracking
export const stripeInfoSchema = z.object({
  stripe_customer_id: z.string().optional(), // Per-customer Stripe entity
  stripe_payment_method_id: z.string().optional(), // Secure payment method token
  stripe_payment_intent_id: z.string().optional(), // For manual capture flow
  authorized_at: z.string().optional(), // When payment was authorized
  captured_at: z.string().optional(), // When payment was captured
  refunded_at: z.string().optional(), // When hold was released
  refund_reason: z.string().optional(), // Why hold was released
  error_message: z.string().optional(), // NEW: Payment error or ID verification failure message
});

// Complete payment info structure (for dealer accounts)
export const paymentInfoSchema = z.object({
  credit_card_info: creditCardInfoSchema.optional(),
  stripe_info: stripeInfoSchema.optional(),
}).optional();

// Payment provider info (for payment records - extends paymentInfoSchema)
export const paymentProviderInfoSchema = z.object({
  // Same structure as PaymentInfo
  credit_card_info: creditCardInfoSchema.optional(),
  stripe_info: stripeInfoSchema.optional(),
  
  // Plus transaction-specific data (optional - used in payments table only)
  stripe_payment_intent_id: z.string().optional(), // For refunds/disputes
}).optional();

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