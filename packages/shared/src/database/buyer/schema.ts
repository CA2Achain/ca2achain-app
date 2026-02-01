import { z } from 'zod';
import { emailSchema, phoneNumberSchema } from '../../common/schema.js';

// =============================================
// PAYMENT STATUS SCHEMA
// =============================================

/**
 * Payment status state machine for safe capture flow
 * 
 * Flow: pending → authorized → id_check_started → id_check_passed → completed
 * 
 * States:
 * - pending: User clicked "Buy", hasn't submitted payment form yet
 * - authorized: Stripe authorized funds (manual capture enabled, funds held, NOT charged)
 * - id_check_started: Persona inquiry created, user starting ID verification
 * - id_check_passed: Persona webhook confirmed ID verification successful
 * - completed: Stripe captured funds, full verification complete (USER CHARGED)
 * - failed: Payment method declined OR ID check failed
 * - authorized_refunded: Stripe refunded authorized hold (ID check failed before capture, NO CHARGE)
 * - completed_refunded: Stripe refunded captured payment (buyer refund request)
 * - error: Unexpected error state (requires manual intervention)
 * 
 * Backward compatibility:
 * - 'succeeded' → old status, now maps to 'completed'
 * - 'refunded' → old status, now maps to 'completed_refunded'
 */
export const paymentStatusSchema = z.enum([
  'pending',
  'authorized',
  'id_check_started',
  'id_check_passed',
  'completed',
  'failed',
  'authorized_refunded',
  'completed_refunded',
  'error',
  'succeeded',        // Backward compat - old status
  'refunded'          // Backward compat - old status
]);

// =============================================
// BUYER ACCOUNT MANAGEMENT
// =============================================

// Buyer registration schema (email optional - comes from authenticated user)
export const buyerRegistrationSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: emailSchema.optional(), // Optional - authenticated user already has email
  phone: z.union([
    z.literal(''), // Accept empty string
    phoneNumberSchema
  ]).optional(),
});

// Complete buyer account database entity schema
// ⚠️ NOTE: These columns map to buyer_accounts table
// Adding new columns requires database migration
export const buyerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(), // References auth.users(id) - Supabase auth
  
  // Basic contact info
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  
  // Immutable reference for ZKP hashes (CCPA compliant)
  buyer_reference_id: z.string(), // 'BUY_a8b9c2d1' - survives account deletion
  
  // =============================================
  // VERIFICATION STATUS
  // =============================================
  // Verification status - tracks ID verification progress
  // States: pending → id_check_started → id_check_passed → verified
  verification_status: z.enum([
    'pending',
    'id_check_started',
    'id_check_passed',
    'verified',
    'expired',
    'rejected'
  ]).default('pending'),
  verified_at: z.string().datetime().optional(),
  verification_expires_at: z.string().datetime().optional(),
  
  // Current verification tracking (links to compliance_events)
  current_verification_id: z.string().uuid().optional(), // compliance_events.id
  
  // Privado ID integration (DIDs only, secrets in separate table)
  privado_did: z.string().optional(),
  privado_credential_id: z.string().optional(),
  
  // =============================================
  // PAYMENT STATUS
  // =============================================
  // Payment status - tracks payment flow
  // Safe Capture Flow:
  // 1. pending: User clicked "Buy"
  // 2. authorized: Stripe authorized (funds held, NOT charged yet)
  // 3. id_check_started: Persona inquiry created
  // 4. id_check_passed: ID verification passed
  // 5. completed: Stripe captured (funds charged)
  //
  // Error states:
  // - failed: Payment declined or ID check failed
  // - authorized_refunded: Authorized hold released (no charge)
  // - completed_refunded: Captured payment refunded
  // - error: Unexpected error
  // - succeeded: Backward compat (old status)
  // - refunded: Backward compat (old status)
  payment_status: paymentStatusSchema.default('pending'),
  
  // Activity tracking
  last_logged_in: z.string().datetime().optional(),
  
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Buyer profile update schema (for account management)
export const buyerProfileUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: phoneNumberSchema.optional(), // Use common phone validation
});

// =============================================
// VERIFICATION INTEGRATION
// =============================================

// Buyer verification history (connects to compliance_events)
export const buyerVerificationHistorySchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_reference_id: z.string(), // Immutable reference 'BUY_a8b9c2d1'
  total_verifications: z.number().int(),
  verification_events: z.array(z.object({
    compliance_event_id: z.string().uuid(),
    dealer_company_name: z.string().optional(),
    dealer_reference_id: z.string(), // 'DLR_f3e4d5c6'
    age_verified: z.boolean(),
    address_verified: z.boolean(),
    address_match_confidence: z.number().min(0).max(1),
    verified_at: z.string().datetime(),
    blockchain_transaction_hash: z.string().optional(), // Polygon immutable record
  }))
});

// =============================================
// CCPA COMPLIANCE
// =============================================

// CCPA data request schema
export const buyerDataRequestSchema = z.object({
  request_type: z.enum(['export', 'delete_data', 'delete_account'], {
    errorMap: () => ({ message: 'Request type must be export, delete_data, or delete_account' })
  })
});

// CCPA data export structure (account data only, secrets handled separately)
export const buyerDataExportSchema = z.object({
  buyer_account: buyerAccountSchema,
  verification_history: buyerVerificationHistorySchema,
  payment_history: z.array(z.object({
    payment_id: z.string().uuid(),
    amount_cents: z.number().int(),
    status: paymentStatusSchema,
    payment_timestamp: z.string().datetime(),
  }))
});