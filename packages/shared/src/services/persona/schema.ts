import { z } from 'zod';
import { emailSchema } from '../../common/schema.js';
import { driverLicenseDataSchema, personaResultsDataSchema } from '../../database/buyer-secrets/schema.js';

// =============================================
// PERSONA INQUIRY CREATION
// =============================================

/**
 * Request to create Persona inquiry
 * Frontend: POST /api/persona/inquiry
 */
export const personaInquiryRequestSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_email: emailSchema,
});

export type PersonaInquiryRequest = z.infer<typeof personaInquiryRequestSchema>;

/**
 * Persona inquiry response (internal representation)
 * What we store and return about an inquiry
 */
export const personaInquiryResponseSchema = z.object({
  id: z.string(),
  buyerId: z.string().uuid(),
  status: z.enum(['created', 'completed']),
  'reference-id': z.string(),
  'session-token': z.string(),
  'created-at': z.string().datetime(),
  'decision-status': z.enum(['approved', 'rejected']).optional(),
});

export type PersonaInquiryResponse = z.infer<typeof personaInquiryResponseSchema>;

/**
 * Hosted URL response for frontend redirect
 * Frontend navigates to hosted_url to complete verification
 */
export const personaHostedUrlResponseSchema = z.object({
  inquiry_id: z.string(),
  hosted_url: z.string().url(),
  session_token: z.string(),
  message: z.string().optional(),
});

export type PersonaHostedUrlResponse = z.infer<typeof personaHostedUrlResponseSchema>;

// =============================================
// PERSONA WEBHOOK
// =============================================

/**
 * Persona webhook payload
 * Fired by Persona when buyer completes ID verification
 */
export const personaWebhookPayloadSchema = z.object({
  id: z.string(),
  data: z.object({
    inquiry_id: z.string(),
    status: z.enum(['passed', 'failed']),
    attributes: z.object({
      'reference-id': z.string(), // buyer_id
      verified_at: z.string().datetime().optional(),
    }).optional(),
  }),
  created_at: z.string().datetime(),
});

export type PersonaWebhookPayload = z.infer<typeof personaWebhookPayloadSchema>;

/**
 * Webhook processing result
 * Determines next action in safe payment capture flow
 */
export const personaWebhookResultSchema = z.object({
  inquiryId: z.string(),
  buyerId: z.string().uuid(),
  status: z.enum(['passed', 'failed']),
  nextAction: z.enum(['capture_payment', 'refund_hold']),
});

export type PersonaWebhookResult = z.infer<typeof personaWebhookResultSchema>;

// =============================================
// VERIFIED DATA EXTRACTION
// =============================================

/**
 * Complete verified data from Persona
 * Matches the EncryptedPersonaData structure from buyer-secrets
 */
export const personaVerifiedDataSchema = z.object({
  driver_license: driverLicenseDataSchema,
  persona_verification_results: personaResultsDataSchema,
});

export type PersonaVerifiedData = z.infer<typeof personaVerifiedDataSchema>;

/**
 * Inquiry status response
 * Used for status polling endpoints
 */
export const inquiryStatusSchema = z.object({
  status: z.string(),
  decision: z.string().optional(),
});

export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

// =============================================
// LEGACY COMPATIBILITY
// =============================================

/**
 * Legacy verified data format
 * For backward compatibility with existing tests
 */
export const legacyVerifiedDataSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  birthdate: z.string(),
  identification_number: z.string(),
  identification_expiration_date: z.string(),
  address_street_1: z.string(),
  address_street_2: z.string(),
  address_city: z.string(),
  address_subdivision: z.string(),
  address_postal_code: z.string(),
});

export type LegacyVerifiedData = z.infer<typeof legacyVerifiedDataSchema>;