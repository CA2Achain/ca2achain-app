import { z } from 'zod';
import {
  buyerCheckoutSessionSchema,
  stripeCheckoutSessionSchema,
  buyerPaymentVerificationSchema,
  buyerPaymentResponseSchema,
  capturePaymentResultSchema,
  refundHoldResultSchema,
  dealerSubscriptionCheckoutSchema,
  dealerSubscriptionResponseSchema,
  dealerSubscriptionResultSchema,
  stripeWebhookEventSchema,
  dealerPlanLimitsSchema,
  DEALER_PLAN_LIMITS,
} from './schema.js';

// =============================================
// BUYER VERIFICATION PAYMENT TYPES
// =============================================

export type BuyerCheckoutSession = z.infer<typeof buyerCheckoutSessionSchema>;
export type StripeCheckoutSession = z.infer<typeof stripeCheckoutSessionSchema>;
export type BuyerPaymentVerification = z.infer<typeof buyerPaymentVerificationSchema>;
export type BuyerPaymentResponse = z.infer<typeof buyerPaymentResponseSchema>;

// =============================================
// PAYMENT CAPTURE & REFUND TYPES
// =============================================

/**
 * Result of capturing payment after ID verification passes
 * Funds are charged to the buyer's card
 */
export type CapturePaymentResult = z.infer<typeof capturePaymentResultSchema>;

/**
 * Result of releasing authorized hold if ID verification fails
 * No charge made - funds are released back to buyer
 */
export type RefundHoldResult = z.infer<typeof refundHoldResultSchema>;

// =============================================
// DEALER SUBSCRIPTION TYPES
// =============================================

export type DealerSubscriptionCheckout = z.infer<typeof dealerSubscriptionCheckoutSchema>;
export type DealerSubscriptionResponse = z.infer<typeof dealerSubscriptionResponseSchema>;

/**
 * Dealer subscription result after activation
 * Contains all subscription details and query limits
 */
export type DealerSubscriptionResult = z.infer<typeof dealerSubscriptionResultSchema>;

/**
 * Dealer subscription plan limits per tier
 * Tier1: 50 queries/month
 * Tier2: 350 queries/month
 * Tier3: 3000 queries/month
 */
export type DealerPlanLimits = z.infer<typeof dealerPlanLimitsSchema>;

// Export plan limits constant for use in code
export { DEALER_PLAN_LIMITS };

// =============================================
// WEBHOOK TYPES
// =============================================

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;