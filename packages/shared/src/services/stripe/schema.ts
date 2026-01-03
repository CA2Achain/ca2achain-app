import { z } from 'zod';
import { emailSchema, paymentStatusSchema } from '../../common/schema.js';

// =============================================
// BUYER VERIFICATION PAYMENT
// =============================================

// Buyer verification checkout session request
export const buyerCheckoutSessionSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_email: emailSchema,
});

// Stripe checkout session response
export const stripeCheckoutSessionSchema = z.object({
  id: z.string(), // Stripe session ID (cs_xxx)
  url: z.string().url(), // Checkout URL to redirect buyer
  payment_intent: z.string().optional(), // Stripe payment intent ID
  client_secret: z.string().optional(), // For client-side payment confirmation
  mode: z.enum(['payment', 'subscription']),
  status: z.enum(['open', 'complete', 'expired']),
});

// Buyer payment verification result
export const buyerPaymentVerificationSchema = z.object({
  buyer_id: z.string().uuid(),
  payment_intent_id: z.string(),
  amount_cents: z.number().int(),
  currency: z.string().default('usd'),
  status: paymentStatusSchema,
  verified_at: z.string().datetime().optional(),
});

// Buyer payment response (safe to send to frontend)
export const buyerPaymentResponseSchema = z.object({
  checkout_url: z.string().url(),
  session_id: z.string(),
  amount_cents: z.number().int(),
  amount_display: z.string(), // "$2.00" for display
});

// =============================================
// WEBHOOK OBJECTS
// =============================================

// Stripe webhook event object (the full object, distinct from event types)
export const stripeWebhookObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number(),
});