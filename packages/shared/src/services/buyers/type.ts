import { z } from 'zod';
import {
  combinedVerificationStartSchema,
  combinedVerificationStartResponseSchema,
  verificationCompleteRequestSchema,
  verificationCompleteResponseSchema,
  webhookRetryRequestSchema,
  webhookRetryResponseSchema,
  resumeVerificationRequestSchema,
  resumeVerificationResponseSchema,
  verificationStateSchema,
} from './schema.js';

// =============================================
// COMBINED VERIFICATION START
// =============================================

export type CombinedVerificationStartRequest = z.infer<typeof combinedVerificationStartSchema>;
export type CombinedVerificationStartResponse = z.infer<typeof combinedVerificationStartResponseSchema>;

// =============================================
// VERIFICATION COMPLETE
// =============================================

export type VerificationCompleteRequest = z.infer<typeof verificationCompleteRequestSchema>;
export type VerificationCompleteResponse = z.infer<typeof verificationCompleteResponseSchema>;

// =============================================
// WEBHOOK RETRY
// =============================================

export type WebhookRetryRequest = z.infer<typeof webhookRetryRequestSchema>;
export type WebhookRetryResponse = z.infer<typeof webhookRetryResponseSchema>;

// =============================================
// RESUME VERIFICATION
// =============================================

export type ResumeVerificationRequest = z.infer<typeof resumeVerificationRequestSchema>;
export type ResumeVerificationResponse = z.infer<typeof resumeVerificationResponseSchema>;

// =============================================
// VERIFICATION STATE
// =============================================

export type VerificationState = z.infer<typeof verificationStateSchema>;