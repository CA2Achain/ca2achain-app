import { z } from 'zod';
import {
  buyerCheckoutSessionSchema,
  stripeCheckoutSessionSchema,
  buyerPaymentVerificationSchema,
  buyerPaymentResponseSchema,
  stripeWebhookObjectSchema,
} from './schema.js';

// =============================================
// BUYER VERIFICATION PAYMENT TYPES
// =============================================

export type BuyerCheckoutSession = z.infer<typeof buyerCheckoutSessionSchema>;
export type StripeCheckoutSession = z.infer<typeof stripeCheckoutSessionSchema>;
export type BuyerPaymentVerification = z.infer<typeof buyerPaymentVerificationSchema>;
export type BuyerPaymentResponse = z.infer<typeof buyerPaymentResponseSchema>;

// =============================================
// WEBHOOK OBJECT TYPE
// =============================================

export type StripeWebhookObject = z.infer<typeof stripeWebhookObjectSchema>;