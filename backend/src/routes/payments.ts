import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';
import { 
  createPaymentEvent, 
  updatePaymentStatus, 
  getBuyerPaymentHistory, 
  getDealerPaymentHistory 
} from '../services/database/payment-events.js';
import { 
  createBuyerCheckoutSession,
  captureBuyerPayment,
  refundBuyerPayment,
  createDealerSubscriptionCheckout,
  verifyDealerSubscription,
  verifyWebhookSignature 
} from '../services/service-resolver.js';
import { updateBuyerAccount, getBuyerById } from '../services/database/buyer-accounts.js';
import {
  type CreatePayment,
  type Payment,
  type BuyerAccount,
  type DealerAccount
} from '@ca2achain/shared';

export default async function paymentsRoutes(fastify: FastifyInstance) {
  // =============================================
  // BUYER PAYMENT ENDPOINTS - SAFE CAPTURE FLOW
  // =============================================

  /**
   * STEP 1: Create buyer payment authorization
   * Payment Status Flow: pending → authorized
   * 
   * Safe Capture Flow:
   * - Stripe authorizes funds with manual capture (funds HELD, NOT charged)
   * - Creates payment record in database
   * - User proceeds to ID verification next
   * - Funds only charged after ID verification passes
   */
  fastify.post('/buyer/checkout', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Create buyer payment authorization (safe capture flow)',
      description: 'Authorize $2.00 verification fee (funds held, not charged yet). Safe flow: authorize → ID check → capture only if ID passes.',
      security: authRequired,
      response: {
        description: 'Payment authorized (funds held)',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              payment_id: { type: 'string', format: 'uuid' },
              payment_status: { type: 'string', enum: ['authorized'] },
              message: { type: 'string' }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Buyer access required', 403);
      }

      const buyer = request.user.account_data as BuyerAccount;
      
      // Check if payment already completed
      if (buyer.payment_status === 'completed') {
        return sendError(reply, 'Payment already completed', 400);
      }

      // Check if already authorized
      if (buyer.payment_status === 'authorized' || buyer.payment_status === 'id_check_started' || buyer.payment_status === 'id_check_passed') {
        return sendError(reply, 'Payment already authorized. Proceed to ID verification.', 400);
      }

      // Create payment event (immutable record in database)
      const paymentData: CreatePayment = {
        buyer_id: buyer.id,
        transaction_type: 'verification',
        amount_cents: 200, // $2.00 in cents
        customer_reference_id: buyer.buyer_reference_id,
        payment_provider_info: {
          stripe_info: {
            stripe_customer_id: `customer_${buyer.buyer_reference_id}`
          }
        }
      };

      const payment = await createPaymentEvent(paymentData);

      // Create Stripe payment intent with MANUAL CAPTURE mode
      // Key: capture_method: 'manual' = authorize but don't charge
      const session = await createBuyerCheckoutSession(
        request.user.email,
        buyer.id
      );

      // Update payment event with Stripe payment intent ID
      await updatePaymentStatus(payment.id, 'authorized', {
        stripe_info: {
          stripe_customer_id: `customer_${buyer.buyer_reference_id}`,
          stripe_payment_intent_id: session.payment_intent,
          authorized_at: new Date().toISOString()
        }
      });

      // Update buyer account: AUTHORIZED state (funds held, not charged)
      await updateBuyerAccount(buyer.id, {
        payment_status: 'authorized',
        stripe_payment_intent_id: session.payment_intent
      });

      console.log(`✅ Payment authorized for buyer ${buyer.buyer_reference_id}: $2.00 held (not charged yet)`);

      return sendSuccess(reply, {
        payment_id: payment.id,
        payment_status: 'authorized',
        message: 'Payment authorized. Funds held. Proceeding to identity verification...'
      }, 200);

    } catch (error) {
      console.error('Create buyer checkout error:', error);
      return sendError(reply, 'Failed to authorize payment', 500);
    }
  });

  /**
   * STEP 2: Get verification status (frontend polling endpoint)
   * Frontend polls this every 3 seconds to check ID verification progress
   * 
   * Safe Capture Flow:
   * - Frontend shows "Verifying..." while polling
   * - Stops polling when status changes to id_check_passed (webhook processed)
   * - Funds captured automatically after status changes to id_check_passed
   */
  fastify.get('/buyer/verification-status', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Get buyer payment and verification status',
      description: 'Frontend polls every 3s. Returns current payment and verification status for safe capture flow tracking.',
      security: authRequired,
      response: {
        description: 'Current status',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              payment_status: { type: 'string' },
              verification_status: { type: 'string' },
              verified_at: { type: 'string' },
              payment_error_message: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Buyer access required', 403);
      }

      const buyer = request.user.account_data as BuyerAccount;

      // Status messages for safe capture flow
      const statusMessages: Record<string, string> = {
        'pending': 'Payment form not yet submitted',
        'authorized': 'Payment authorized. Funds held. Starting ID verification...',
        'id_check_started': 'ID verification in progress. Please complete the Persona verification.',
        'id_check_passed': 'ID verification successful! Completing payment capture...',
        'completed': 'Verification complete! Your account is fully activated.',
        'failed': 'Verification failed. No charge was made. You can retry.',
        'authorized_refunded': 'ID verification failed. Authorized hold released. No charge made.',
        'completed_refunded': 'Payment refunded successfully.',
        'error': 'An error occurred. Please contact support.'
      };

      return sendSuccess(reply, {
        payment_status: buyer.payment_status,
        verification_status: buyer.verification_status,
        verified_at: buyer.verified_at,
        payment_error_message: buyer.payment_error_message,
        message: statusMessages[buyer.payment_status] || 'Status unknown'
      }, 200);

    } catch (error) {
      console.error('Get verification status error:', error);
      return sendError(reply, 'Failed to get status', 500);
    }
  });

  /**
   * STEP 3: Capture payment (internal endpoint - called by Persona webhook)
   * Payment Status Flow: id_check_passed → completed
   * 
   * Safe Capture Flow:
   * - Called automatically by Persona webhook after ID verification passes
   * - This is when we ACTUALLY CHARGE the card
   * - Funds were only held/authorized before this step
   */
  fastify.post('/buyer/capture', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Capture buyer payment (internal - called by webhook)',
      description: 'Internal endpoint called by Persona webhook after ID passes. Captures the previously authorized payment (actually charges the card).',
      body: {
        type: 'object',
        properties: {
          buyer_id: { type: 'string', format: 'uuid' },
          payment_id: { type: 'string', format: 'uuid' }
        },
        required: ['buyer_id', 'payment_id']
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { buyer_id, payment_id } = request.body as { buyer_id: string; payment_id: string };

      // INTERNAL ENDPOINT - no auth required (called by webhook)
      // In production: verify webhook signature

      // Get buyer account
      const buyer = await getBuyerById(buyer_id);
      if (!buyer) {
        return sendError(reply, 'Buyer not found', 404);
      }

      if (!buyer.stripe_payment_intent_id) {
        return sendError(reply, 'No authorized payment found', 400);
      }

      // CAPTURE the payment - actually charge the card
      // This uses the payment intent that was previously authorized
      const captureResult = await captureBuyerPayment(buyer.stripe_payment_intent_id);

      if (!captureResult) {
        return sendError(reply, 'Payment capture failed', 400);
      }

      // Update payment event: mark as completed
      await updatePaymentStatus(payment_id, 'completed', {
        stripe_info: {
          stripe_payment_intent_id: buyer.stripe_payment_intent_id,
          captured_at: new Date().toISOString()
        }
      });

      // Update buyer account: COMPLETED state (funds charged, fully verified)
      await updateBuyerAccount(buyer.id, {
        payment_status: 'completed',
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verification_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      console.log(`✅ Payment captured for buyer ${buyer.buyer_reference_id}: $2.00 charged`);

      return sendSuccess(reply, {
        payment_id,
        payment_status: 'completed',
        message: 'Payment captured successfully'
      }, 200);

    } catch (error) {
      console.error('Capture payment error:', error);
      return sendError(reply, 'Failed to capture payment', 500);
    }
  });

  /**
   * STEP 4: Refund authorized hold (internal endpoint - called by Persona webhook)
   * Payment Status Flow: id_check_started → authorized_refunded
   * 
   * Safe Capture Flow:
   * - Called automatically by Persona webhook if ID verification FAILS
   * - Releases the authorized hold (no charge made, no refund needed)
   * - User sees "No charge made. You can retry."
   */
  fastify.post('/buyer/refund-hold', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Refund authorized hold (internal - called by webhook)',
      description: 'Internal endpoint called by Persona webhook if ID fails. Releases the authorized hold (no charge made).',
      body: {
        type: 'object',
        properties: {
          buyer_id: { type: 'string', format: 'uuid' },
          payment_id: { type: 'string', format: 'uuid' },
          reason: { type: 'string' }
        },
        required: ['buyer_id', 'payment_id']
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { buyer_id, payment_id, reason } = request.body as { buyer_id: string; payment_id: string; reason?: string };

      // INTERNAL ENDPOINT - no auth required (called by webhook)
      // In production: verify webhook signature

      const buyer = await getBuyerById(buyer_id);
      if (!buyer) {
        return sendError(reply, 'Buyer not found', 404);
      }

      if (!buyer.stripe_payment_intent_id) {
        return sendError(reply, 'No authorized payment found', 400);
      }

      // RELEASE the authorized hold
      // This cancels the Stripe payment intent (no charge, just releases the hold)
      const refundResult = await refundBuyerPayment(buyer.stripe_payment_intent_id);

      if (!refundResult) {
        return sendError(reply, 'Refund failed', 400);
      }

      // Update payment event: mark as authorized_refunded
      await updatePaymentStatus(payment_id, 'authorized_refunded', {
        stripe_info: {
          stripe_payment_intent_id: buyer.stripe_payment_intent_id,
          refunded_at: new Date().toISOString(),
          refund_reason: reason || 'ID verification failed'
        }
      });

      // Update buyer account: AUTHORIZED_REFUNDED state
      await updateBuyerAccount(buyer.id, {
        payment_status: 'authorized_refunded',
        payment_error_message: `ID verification failed. Authorized hold released. ${reason || 'Please retry.'}`,
        verification_status: 'rejected'
      });

      console.log(`✅ Authorized hold released for buyer ${buyer.buyer_reference_id}: no charge made`);

      return sendSuccess(reply, {
        payment_id,
        payment_status: 'authorized_refunded',
        message: 'Authorized hold released. No charge made. You can retry verification.'
      }, 200);

    } catch (error) {
      console.error('Refund hold error:', error);
      return sendError(reply, 'Failed to release authorized hold', 500);
    }
  });

  // =============================================
  // DEALER PAYMENT ENDPOINTS

  /**
   * COMBINED VERIFICATION START: Single endpoint for auth + inquiry
   * Replaces: POST /buyer/checkout + POST /persona/inquiry
   * Frontend: Single click, auto-opens Persona modal
   */
  fastify.post('/buyer/start-verification', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Start combined verification (auth + inquiry)',
      description: 'Single endpoint: authorizes payment AND creates ID inquiry. Returns payment_id + inquiry_id.',
      security: authRequired,
      response: {
        description: 'Payment authorized and inquiry created',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              payment_id: { type: 'string', format: 'uuid' },
              inquiry_id: { type: 'string' },
              session_token: { type: 'string' },
              payment_status: { type: 'string', enum: ['authorized'] },
              verification_status: { type: 'string', enum: ['id_check_started'] },
              message: { type: 'string' }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Buyer access required', 403);
      }

      const buyer = request.user.account_data as BuyerAccount;

      if (['authorized', 'id_check_started', 'id_check_passed', 'completed'].includes(buyer.payment_status)) {
        return sendError(reply, 'Verification already in progress or complete', 400);
      }

      const paymentData: CreatePayment = {
        buyer_id: buyer.id,
        transaction_type: 'verification',
        amount_cents: 200,
        customer_reference_id: buyer.buyer_reference_id,
        payment_provider_info: {
          stripe_info: {
            stripe_customer_id: `customer_${buyer.buyer_reference_id}`
          }
        }
      };

      const payment = await createPaymentEvent(paymentData);
      const session = await createBuyerCheckoutSession(request.user.email, buyer.id);

      await updatePaymentStatus(payment.id, 'authorized', {
        stripe_info: {
          stripe_customer_id: `customer_${buyer.buyer_reference_id}`,
          stripe_payment_intent_id: session.payment_intent,
          authorized_at: new Date().toISOString()
        }
      });

      const { createBuyerInquiry } = await import('../services/mocks/persona.js');
      const inquiry = await createBuyerInquiry(buyer.id);

      await updateBuyerAccount(buyer.id, {
        payment_status: 'authorized',
        verification_status: 'id_check_started',
        stripe_payment_intent_id: session.payment_intent
      });

      console.log(`✅ Combined verification started for buyer ${buyer.buyer_reference_id}`);

      return sendSuccess(reply, {
        payment_id: payment.id,
        inquiry_id: inquiry.id,
        session_token: inquiry.attributes['session-token'],
        payment_status: 'authorized',
        verification_status: 'id_check_started',
        message: 'Payment authorized and ID inquiry created. Complete ID verification to finalize.'
      }, 200);

    } catch (error) {
      console.error('Combined verification start error:', error);
      return sendError(reply, 'Failed to start verification', 500);
    }
  });

  /**
   * WEBHOOK COMPLETE CALLBACK: Frontend signals Persona modal completed
   * Waits for webhook processing (max 10 seconds)
   */
  fastify.post('/buyer/webhook-complete', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Webhook callback - Persona modal completed',
      description: 'Called after Persona modal closes. Waits for webhook (10s timeout).',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', format: 'uuid' },
          inquiry_id: { type: 'string' }
        },
        required: ['payment_id', 'inquiry_id']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer') {
        return sendError(reply, 'Buyer access required', 403);
      }

      const { payment_id, inquiry_id } = request.body as { payment_id: string; inquiry_id: string };
      const buyer = request.user.account_data as BuyerAccount;

      if (!payment_id || !inquiry_id) {
        return sendValidationError(reply, 'Missing payment_id or inquiry_id');
      }

      const WEBHOOK_TIMEOUT_MS = 10000;
      const POLL_INTERVAL_MS = 500;
      const startTime = Date.now();

      console.log(`⏳ Waiting for webhook processing...`);

      while (Date.now() - startTime < WEBHOOK_TIMEOUT_MS) {
        const updatedBuyer = await getBuyerById(buyer.id);
        
        if (!updatedBuyer) {
          return sendError(reply, 'Buyer account not found', 404);
        }

        if (updatedBuyer.payment_status !== 'id_check_started' && updatedBuyer.payment_status !== 'authorized') {
          console.log(`✅ Webhook processed! Status: ${updatedBuyer.payment_status}`);
          
          if (updatedBuyer.payment_status === 'completed') {
            return sendSuccess(reply, {
              payment_status: 'completed',
              verification_status: 'verified',
              message: 'Verification complete! Your account is ready.'
            }, 200);
          } else if (updatedBuyer.payment_status === 'authorized_refunded') {
            return sendSuccess(reply, {
              payment_status: 'authorized_refunded',
              verification_status: 'rejected',
              message: 'ID verification unsuccessful. No charge made. You can try again.'
            }, 200);
          }
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      console.log(`⚠️  Webhook timeout`);
      return sendSuccess(reply, {
        payment_status: 'id_check_pending',
        verification_status: 'id_check_pending',
        message: 'Verification is being processed. Please wait or refresh the page.'
      }, 200);

    } catch (error) {
      console.error('Webhook complete error:', error);
      return sendError(reply, 'Error waiting for webhook', 500);
    }
  });

  /**
   * WEBHOOK RETRY: Retry webhook if it failed
   * Idempotent - safe to call multiple times
   */
  fastify.post('/buyer/webhook-retry', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Retry webhook processing',
      description: 'Idempotent - safe to call multiple times',
      body: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', format: 'uuid' },
          inquiry_id: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['payment_id', 'inquiry_id']
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { payment_id, inquiry_id } = request.body as { payment_id: string; inquiry_id: string };

      if (!payment_id || !inquiry_id) {
        return sendValidationError(reply, 'Missing payment_id or inquiry_id');
      }

      console.log(`🔄 Webhook retry requested for payment ${payment_id}`);

      return sendSuccess(reply, {
        retry_result: 'webhook_retry_initiated',
        message: 'Webhook retry initiated',
        should_retry: true,
        retry_after_ms: 3000
      }, 200);

    } catch (error) {
      console.error('Webhook retry error:', error);
      return sendError(reply, 'Webhook retry failed', 500);
    }
  });

  // =============================================

  fastify.post('/dealer/subscription', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Create dealer subscription payment',
      description: 'Create Stripe checkout for dealer subscription',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          subscription_tier: { type: 'integer', minimum: 1, maximum: 3 }
        },
        required: ['subscription_tier']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Dealer access required', 403);
      }

      const dealer = request.user.account_data as DealerAccount;
      const { subscription_tier } = request.body as { subscription_tier: number };

      if (!dealer || typeof dealer !== 'object' || !('dealer_reference_id' in dealer)) {
        return sendError(reply, 'Invalid dealer account structure', 500);
      }

      const dealerReferenceId = dealer.dealer_reference_id as string;
      if (!dealerReferenceId) {
        return sendError(reply, 'Missing dealer reference ID', 500);
      }

      const tierPricing = { 1: 19900, 2: 99900, 3: 379900 };
      const amount = tierPricing[subscription_tier as keyof typeof tierPricing];

      const paymentData: CreatePayment = {
        dealer_id: dealer.id,
        transaction_type: 'subscription',
        amount_cents: amount,
        customer_reference_id: dealerReferenceId,
        payment_provider_info: {
          stripe_info: {
            stripe_customer_id: `dealer_${dealerReferenceId}`
          }
        }
      };

      const payment = await createPaymentEvent(paymentData);

      const session = await createDealerSubscriptionCheckout(
        dealer.business_email,
        dealer.company_name,
        dealer.id,
        `tier${subscription_tier}` as 'tier1' | 'tier2' | 'tier3'
      );

      return sendSuccess(reply, {
        checkout_url: session.url,
        session_id: session.id,
        payment_id: payment.id
      }, 200);

    } catch (error) {
      console.error('Create dealer subscription error:', error);
      return sendError(reply, 'Failed to create subscription session', 500);
    }
  });

  fastify.get('/history', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Get payment history',
      description: 'Get payment history for authenticated buyer or dealer',
      security: authRequired,
      response: {
        description: 'Payment history',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['buyer', 'dealer'] },
              customer_reference_id: { type: 'string' },
              total_payments: { type: 'integer' },
              payments: {
                type: 'array',
                items: { type: 'object' }
              }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || !request.user.role || !request.user.account_data) {
        return sendError(reply, 'Account not found', 404);
      }

      const accountData = request.user.account_data;
      let payments: Payment[];
      let customerReferenceId: string;

      if (request.user.role === 'buyer') {
        const buyerData = accountData as BuyerAccount;
        payments = await getBuyerPaymentHistory(buyerData.id);
        customerReferenceId = buyerData.buyer_reference_id;
      } else {
        const dealerData = accountData as DealerAccount;
        if (!dealerData || !('dealer_reference_id' in dealerData)) {
          return sendError(reply, 'Invalid dealer account structure', 500);
        }
        const dealerReferenceId = dealerData.dealer_reference_id as string;
        if (!dealerReferenceId) {
          return sendError(reply, 'Missing dealer reference ID', 500);
        }
        payments = await getDealerPaymentHistory(dealerData.id);
        customerReferenceId = dealerReferenceId;
      }

      const response = {
        role: request.user.role,
        customer_reference_id: customerReferenceId,
        total_payments: payments.length,
        payments: payments.map(p => ({
          id: p.id,
          transaction_type: p.transaction_type,
          amount_cents: p.amount_cents,
          status: p.status,
          payment_timestamp: p.payment_timestamp,
          account_active: true
        }))
      };

      return sendSuccess(reply, response, 200);

    } catch (error) {
      console.error('Get payment history error:', error);
      return sendError(reply, 'Failed to get payment history', 500);
    }
  });
}