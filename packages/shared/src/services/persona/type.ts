import { z } from 'zod';
import {
  personaInquiryRequestSchema,
  personaInquiryResponseSchema,
  personaHostedUrlResponseSchema,
  personaWebhookPayloadSchema,
  personaWebhookResultSchema,
  personaVerifiedDataSchema,
  inquiryStatusSchema,
  legacyVerifiedDataSchema,
} from './schema.js';

// =============================================
// PERSONA INQUIRY TYPES
// =============================================

export type PersonaInquiryRequest = z.infer<typeof personaInquiryRequestSchema>;
export type PersonaInquiryResponse = z.infer<typeof personaInquiryResponseSchema>;
export type PersonaHostedUrlResponse = z.infer<typeof personaHostedUrlResponseSchema>;

// =============================================
// PERSONA WEBHOOK TYPES
// =============================================

export type PersonaWebhookPayload = z.infer<typeof personaWebhookPayloadSchema>;

/**
 * Webhook processing result
 * Determines next action in safe payment capture flow:
 * - 'capture_payment': ID verification passed, charge the card
 * - 'refund_hold': ID verification failed, release authorized hold
 */
export type PersonaWebhookResult = z.infer<typeof personaWebhookResultSchema>;

// =============================================
// VERIFIED DATA TYPES
// =============================================

export type PersonaVerifiedData = z.infer<typeof personaVerifiedDataSchema>;

/**
 * Legacy verified data format
 * For backward compatibility with existing code
 */
export type LegacyVerifiedData = z.infer<typeof legacyVerifiedDataSchema>;

// =============================================
// STATUS TYPES
// =============================================

/**
 * Inquiry status for polling endpoints
 */
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;