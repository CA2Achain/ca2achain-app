import { z } from 'zod';
import { paymentStatusSchema } from '../../common/schema.js';

// =============================================
// BUYER PAYMENT - SAFE CAPTURE FLOW
// =============================================

/**
 * Buyer checkout session request
 * Frontend: POST /api/payments/buyer/checkout
 */
export const buyerCheckoutSessionSchema = z.object({
  buyer_id: z.string().uuid(),
});

export type BuyerCheckoutSession = z.infer<typeof buyerCheckoutSessionSchema>;

/**
 * Stripe checkout session response
 * Contains session URL for payment form and payment intent ID
 */
export const stripeCheckoutSessionSchema = z.object({
  id: z.string(), // cs_xxx
  url: z.string().url(),
  payment_intent: z.string(), // pi_xxx
  metadata: z.record(z.string()).optional(),
  mode: z.enum(['payment', 'subscription']),
  status: z.enum(['open', 'complete', 'expired']),
});

export type StripeCheckoutSession = z.infer<typeof stripeCheckoutSessionSchema>;

/**
 * Payment authorization result
 * After Stripe authorizes funds (before ID check)
 */
export const buyerPaymentVerificationSchema = z.object({
  buyerId: z.string().uuid(),
  paymentIntentId: z.string(),
  amountAuthorized: z.number().int(),
  status: z.literal('authorized'),
  captureMethod: z.literal('manual'),
});

export type BuyerPaymentVerification = z.infer<typeof buyerPaymentVerificationSchema>;

/**
 * Payment response to frontend (safe to send)
 */
export const buyerPaymentResponseSchema = z.object({
  payment_id: z.string().uuid(),
  payment_status: z.enum(['authorized']),
  message: z.string(),
});

export type BuyerPaymentResponse = z.infer<typeof buyerPaymentResponseSchema>;

// =============================================
// PAYMENT CAPTURE & REFUND
// =============================================

/**
 * Capture payment result
 * Called after ID verification passes
 * Charges the card
 */
export const capturePaymentResultSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().int(),
  amountCaptured: z.number().int(),
  status: z.literal('captured'),
  capturedAt: z.string().datetime(),
});

export type CapturePaymentResult = z.infer<typeof capturePaymentResultSchema>;

/**
 * Refund hold result
 * Called if ID verification fails
 * Releases authorized hold (no charge made)
 */
export const refundHoldResultSchema = z.object({
  paymentIntentId: z.string(),
  status: z.literal('canceled'),
  canceledAt: z.string().datetime(),
  message: z.string(),
});

export type RefundHoldResult = z.infer<typeof refundHoldResultSchema>;

// =============================================
// DEALER SUBSCRIPTION
// =============================================

/**
 * Dealer subscription checkout request
 * Frontend: POST /api/payments/dealer/subscription
 */
export const dealerSubscriptionCheckoutSchema = z.object({
  dealer_id: z.string().uuid(),
  subscription_tier: z.enum(['tier1', 'tier2', 'tier3']),
});

export type DealerSubscriptionCheckout = z.infer<typeof dealerSubscriptionCheckoutSchema>;

/**
 * Dealer subscription response
 * Contains checkout URL
 */
export const dealerSubscriptionResponseSchema = z.object({
  checkout_url: z.string().url(),
  session_id: z.string(),
  payment_id: z.string().uuid(),
});

export type DealerSubscriptionResponse = z.infer<typeof dealerSubscriptionResponseSchema>;

/**
 * Dealer subscription result
 * After subscription is verified/activated
 */
export const dealerSubscriptionResultSchema = z.object({
  dealerId: z.string().uuid(),
  stripeCustomerId: z.string(),
  subscriptionId: z.string(),
  subscriptionStatus: z.literal('active'),
  monthlyQueryLimit: z.number().int(),
  planTier: z.enum(['tier1', 'tier2', 'tier3']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
});

export type DealerSubscriptionResult = z.infer<typeof dealerSubscriptionResultSchema>;

// =============================================
// WEBHOOK
// =============================================

/**
 * Stripe webhook event
 * Base structure for all Stripe webhooks
 */
export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number(),
});

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;

// =============================================
// PLAN LIMITS
// =============================================

/**
 * Dealer subscription plan limits
 * Tier mapping to monthly verification queries
 */
export const dealerPlanLimitsSchema = z.object({
  tier1: z.literal(50),    // Starter
  tier2: z.literal(350),   // Business
  tier3: z.literal(3000),  // Enterprise
});

export type DealerPlanLimits = z.infer<typeof dealerPlanLimitsSchema>;

// Export plan limits constant
export const DEALER_PLAN_LIMITS: DealerPlanLimits = {
  tier1: 50,
  tier2: 350,
  tier3: 3000,
};