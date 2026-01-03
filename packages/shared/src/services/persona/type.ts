import { z } from 'zod';
import {
  personaInquiryRequestSchema,
  personaInquiryResponseSchema,
  personaHostedUrlResponseSchema,
  personaWebhookPayloadSchema,
  personaVerifiedDataSchema,
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

// =============================================
// VERIFIED DATA TYPES
// =============================================

export type PersonaVerifiedData = z.infer<typeof personaVerifiedDataSchema>;