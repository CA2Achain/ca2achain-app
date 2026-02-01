import { z } from 'zod';
import { emailSchema } from '../../common/schema.js';

// =============================================
// COMBINED VERIFICATION START
// =============================================

/**
 * Request to start verification (combines checkout + inquiry)
 * Frontend: POST /api/buyers/start-verification
 * Single endpoint replaces: POST /checkout + POST /inquiry
 */
export const combinedVerificationStartSchema = z.object({
  // Auto-filled from JWT - no body needed
  // But included for explicit typing
});

export type CombinedVerificationStartRequest = z.infer<typeof combinedVerificationStartSchema>;

/**
 * Response from starting verification
 * Returns everything needed to open Persona modal
 */
export const combinedVerificationStartResponseSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string(),
  session_token: z.string(),
  payment_status: z.literal('authorized'),
  verification_status: z.literal('id_check_started'),
  message: z.string(),
});

export type CombinedVerificationStartResponse = z.infer<typeof combinedVerificationStartResponseSchema>;

// =============================================
// VERIFICATION COMPLETE (Webhook Callback)
// =============================================

/**
 * Request from frontend when Persona modal closes
 * Frontend: POST /api/buyers/webhook-complete
 * Signals: "User completed ID verification, check result"
 */
export const verificationCompleteRequestSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string(),
});

export type VerificationCompleteRequest = z.infer<typeof verificationCompleteRequestSchema>;

/**
 * Response when verification complete
 * Returns final status (success or retry)
 */
export const verificationCompleteResponseSchema = z.object({
  payment_status: z.enum([
    'completed',                // Success - funds charged
    'authorized_refunded',      // ID failed - hold released
    'id_check_pending',         // Webhook still processing
    'error'                      // Unexpected error
  ]),
  verification_status: z.enum([
    'verified',                 // Success
    'rejected',                 // ID failed
    'id_check_pending',         // Still processing
    'error'                      // Unexpected error
  ]),
  message: z.string(),
  retry_available: z.boolean().optional(),  // Can user retry?
});

export type VerificationCompleteResponse = z.infer<typeof verificationCompleteResponseSchema>;

// =============================================
// WEBHOOK RETRY (Recovery)
// =============================================

/**
 * Request to retry webhook processing
 * Backend internal: POST /api/payments/buyer/webhook-retry
 * Used when: Webhook timed out, frontend polling exceeded, manual retry
 */
export const webhookRetryRequestSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string(),
  reason: z.enum([
    'polling_timeout',          // Frontend polling exceeded 2 min
    'manual_retry',             // User clicked "Retry"
    'webhook_timeout',          // Webhook POST failed
    'recovery'                  // Backend recovery procedure
  ]).optional(),
});

export type WebhookRetryRequest = z.infer<typeof webhookRetryRequestSchema>;

/**
 * Response from webhook retry
 */
export const webhookRetryResponseSchema = z.object({
  payment_status: z.enum([
    'completed',
    'authorized_refunded',
    'id_check_pending',
    'error'
  ]),
  verification_status: z.enum([
    'verified',
    'rejected',
    'id_check_pending',
    'error'
  ]),
  retry_result: z.enum([
    'webhook_already_processed',    // Webhook already succeeded
    'webhook_processed_now',        // Webhook processed during retry
    'webhook_processing',           // Still processing, retry again soon
    'webhook_failed',               // Webhook failed, contact support
    'error'                         // Unexpected error
  ]),
  message: z.string(),
  should_retry: z.boolean(),        // Should frontend retry again?
  retry_after_ms: z.number().optional(),  // Wait this long before retry
});

export type WebhookRetryResponse = z.infer<typeof webhookRetryResponseSchema>;

// =============================================
// RESUME VERIFICATION
// =============================================

/**
 * Resume an in-progress verification
 * Frontend: GET /api/buyers/verification-resume
 * Called on page load if payment_id in URL or localStorage
 */
export const resumeVerificationRequestSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string().optional(),
});

export type ResumeVerificationRequest = z.infer<typeof resumeVerificationRequestSchema>;

/**
 * Response when resuming verification
 */
export const resumeVerificationResponseSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string().optional(),
  session_token: z.string().optional(),
  payment_status: z.string(),
  verification_status: z.string(),
  should_open_modal: z.boolean(),  // Should frontend open Persona modal again?
  message: z.string(),
});

export type ResumeVerificationResponse = z.infer<typeof resumeVerificationResponseSchema>;

// =============================================
// VERIFICATION STATE (For URL/localStorage)
// =============================================

/**
 * State to persist across page refresh
 * Stored in: URL query param + localStorage
 * Used for: Resume capability
 */
export const verificationStateSchema = z.object({
  payment_id: z.string().uuid(),
  inquiry_id: z.string(),
  session_token: z.string(),
  started_at: z.string().datetime(),
  step: z.enum([
    'payment_authorized',       // Payment authorized, ready for ID
    'id_check_started',         // Persona modal opened
    'id_check_pending',         // Waiting for webhook
    'completed',                // Success
    'rejected',                 // ID failed
    'error'                     // Error occurred
  ]),
  error_message: z.string().optional(),
});

export type VerificationState = z.infer<typeof verificationStateSchema>;