import { z } from 'zod';
import { emailSchema } from '../../common/schema.js';
import { driverLicenseDataSchema, personaResultsDataSchema } from '../../database/buyer-secrets/schema.js';

// =============================================
// PERSONA INQUIRY CREATION
// =============================================

// Request to create Persona inquiry
export const personaInquiryRequestSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_email: emailSchema,
});

// Persona inquiry response (what we get back from Persona API)
export const personaInquiryResponseSchema = z.object({
  id: z.string(), // Persona inquiry ID (inq_xxx)
  attributes: z.object({
    status: z.enum(['created', 'approved', 'failed', 'pending', 'needs_review']),
    'reference-id': z.string(), // buyer_id
    'session-token': z.string(), // For redirecting to Persona hosted flow
    'created-at': z.string().datetime(),
  }),
});

// Hosted URL to redirect buyer to Persona
export const personaHostedUrlResponseSchema = z.object({
  inquiry_id: z.string(),
  hosted_url: z.string().url(), // URL to redirect buyer to
  session_token: z.string(),
});

// =============================================
// PERSONA WEBHOOK
// =============================================

// Persona webhook payload for identity verification completion
export const personaWebhookPayloadSchema = z.object({
  id: z.string(), // Webhook ID
  data: z.object({
    inquiry_id: z.string(), // The inquiry that completed
    status: z.enum(['passed', 'failed', 'needs_review']), // Verification result
    attributes: z.object({
      'reference-id': z.string(), // buyer_id
      verified_at: z.string().datetime(),
      // Optional extracted fields (if passed)
      name: z.string().optional(),
      dob: z.string().optional(), // YYYY-MM-DD
      dl_number: z.string().optional(),
      address: z.string().optional(),
    }).optional(),
  }),
  created_at: z.string().datetime(),
});

// =============================================
// VERIFIED DATA EXTRACTION
// =============================================

// Complete verified data from Persona (after webhook confirmation)
export const personaVerifiedDataSchema = z.object({
  inquiry_id: z.string(),
  buyer_id: z.string().uuid(),
  verification_status: z.enum(['passed', 'failed', 'needs_review']),
  verified_at: z.string().datetime(),
  // Driver license data extracted by Persona
  driver_license: driverLicenseDataSchema.optional(),
  // Persona verification results
  persona_results: personaResultsDataSchema.optional(),
});