import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, sendUnauthorized, authRequired } from '../utils/api-responses.js';
import { createBuyer, getBuyerByAuth, getBuyerById, updateBuyerAccount } from '../services/database/buyer-accounts.js';
import { deleteBuyerData, exportBuyerData } from '../services/database/ccpa-privacy.js';
import { getVerificationHistory } from '../services/database/compliance-events.js';
import { createPaymentEvent, updatePaymentStatus } from '../services/database/payment-events.js';
import { createBuyerCheckoutSession } from '../services/service-resolver.js';
import { 
  buyerRegistrationSchema, 
  buyerProfileUpdateSchema, 
  buyerDataRequestSchema,
  type BuyerRegistration, 
  type BuyerProfileUpdate,
  type BuyerDataRequest,
  type BuyerAccount,
  type CreatePayment
} from '@ca2achain/shared';

export default async function buyerRoutes(fastify: FastifyInstance) {
  // =============================================
  // ORIGINAL BUYER PROFILE ENDPOINTS
  // =============================================

  // Complete buyer profile
  fastify.post('/complete-profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Complete buyer profile',
      description: 'Creates buyer_accounts entry after email verification',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string', minLength: 1 },
          last_name: { type: 'string', minLength: 1 },
          phone: { type: 'string' }
        },
        required: ['first_name', 'last_name']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (request.user!.role !== 'buyer') {
        return sendError(reply, 'Only buyers can access this endpoint', 403);
      }

      const profileData = buyerRegistrationSchema.parse(request.body) as BuyerRegistration;
      const existingBuyer = await getBuyerByAuth(request.user!.id);
      
      if (existingBuyer) {
        return sendError(reply, 'Profile already exists', 400);
      }

      const completeProfileData = {
        ...profileData,
        email: request.user!.email
      };

      const buyer = await createBuyer(request.user!.id, completeProfileData);

      return sendSuccess(reply, {
        id: buyer.id,
        buyer_reference_id: buyer.buyer_reference_id,
        verification_status: buyer.verification_status
      }, 201);
    } catch (error) {
      console.error('Complete profile error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid profile data');
      }
      return sendError(reply, 'Failed to complete profile', 500);
    }
  });

  // Get buyer profile
  fastify.get('/profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Get buyer profile',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Profile not completed', 403);
      }
      return sendSuccess(reply, request.user.account_data, 200);
    } catch (error) {
      return sendError(reply, 'Failed to retrieve profile', 500);
    }
  });

  // Update buyer profile
  fastify.patch('/profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Update buyer profile',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Profile not found', 404);
      }

      const updateData = buyerProfileUpdateSchema.parse(request.body) as BuyerProfileUpdate;
      const buyer = request.user.account_data as BuyerAccount;
      const updatedBuyer = await updateBuyerAccount(buyer.id, updateData);

      return sendSuccess(reply, updatedBuyer, 200);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid update data');
      }
      return sendError(reply, 'Failed to update profile', 500);
    }
  });

  // Get verification history
  fastify.get('/verification-history', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Get verification history',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Profile not found', 404);
      }

      const buyer = request.user.account_data as BuyerAccount;
      const history = await getVerificationHistory(buyer.id);

      return sendSuccess(reply, history, 200);
    } catch (error) {
      return sendError(reply, 'Failed to retrieve verification history', 500);
    }
  });

  // CCPA: Export data
  fastify.post('/ccpa/export', {
    ...createRouteSchema({
      tags: ['buyer', 'ccpa'],
      summary: 'Export buyer data',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Buyer account required', 403);
      }

      const buyer = request.user.account_data as BuyerAccount;
      const exportedData = await exportBuyerData(buyer.id);

      return sendSuccess(reply, exportedData, 200);
    } catch (error) {
      return sendError(reply, 'Failed to export data', 500);
    }
  });

  // CCPA: Delete data
  fastify.post('/ccpa/delete', {
    ...createRouteSchema({
      tags: ['buyer', 'ccpa'],
      summary: 'Delete buyer data',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'buyer' || !request.user.account_data) {
        return sendError(reply, 'Buyer account required', 403);
      }

      const { request_type } = buyerDataRequestSchema.parse(request.body);
      const buyer = request.user.account_data as BuyerAccount;
      await deleteBuyerData(buyer.id);

      return sendSuccess(reply, { message: 'Data deletion initiated' }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid request type');
      }
      return sendError(reply, 'Failed to delete data', 500);
    }
  });

  // =============================================
  // NEW: 2+1 EFFICIENT FLOW ENDPOINTS
  // =============================================

  /**
   * COMBINED VERIFICATION START: Single endpoint for auth + inquiry
   * Replaces two separate calls: POST /checkout + POST /inquiry
   * Frontend: Single "Purchase Verification" button, auto-opens Persona modal
   */
  fastify.post('/start-verification', {
    ...createRouteSchema({
      tags: ['buyer'],
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

      // Safety check: if already authorized/in progress, don't create duplicate
      if (['authorized', 'id_check_started', 'id_check_passed', 'completed'].includes(buyer.payment_status)) {
        return sendError(reply, 'Verification already in progress or complete', 400);
      }

      // STEP 1: Create payment authorization
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

      // Create Stripe payment intent with manual capture (funds held, not charged)
      const session = await createBuyerCheckoutSession(
        request.user.email,
        buyer.id
      );

      // Update payment event with Stripe intent ID
      await updatePaymentStatus(payment.id, 'authorized', {
        stripe_info: {
          stripe_customer_id: `customer_${buyer.buyer_reference_id}`,
          stripe_payment_intent_id: session.payment_intent,
          authorized_at: new Date().toISOString()
        }
      });

      // STEP 2: Create Persona inquiry
      const { createBuyerInquiry } = await import('../services/mocks/persona.js');
      const inquiry = await createBuyerInquiry(buyer.id);

      // Update buyer with both payment and inquiry IDs
      await updateBuyerAccount(buyer.id, {
        payment_status: 'authorized',
        verification_status: 'id_check_started',
        stripe_payment_intent_id: session.payment_intent
      });

      console.log(`✅ Combined verification started for buyer ${buyer.buyer_reference_id}`);
      console.log(`   Payment authorized: $2.00 held (not charged yet)`);
      console.log(`   ID inquiry created: ready for Persona verification`);

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
   * Backend waits for webhook (max 10 seconds)
   * Returns final status: completed or rejected
   */
  fastify.post('/webhook-complete', {
    ...createRouteSchema({
      tags: ['buyer'],
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

      console.log(`✅ Webhook complete signal received for buyer ${buyer.buyer_reference_id}`);

      // Wait for webhook processing with timeout
      const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
      const POLL_INTERVAL_MS = 500; // Check every 500ms
      const startTime = Date.now();

      console.log(`⏳ Waiting for webhook processing (${WEBHOOK_TIMEOUT_MS}ms timeout)...`);

      while (Date.now() - startTime < WEBHOOK_TIMEOUT_MS) {
        // Refresh buyer data to check for status updates from webhook
        const updatedBuyer = await getBuyerById(buyer.id);
        
        if (!updatedBuyer) {
          return sendError(reply, 'Buyer account not found', 404);
        }

        // Check if status changed from 'id_check_started' (webhook processed)
        if (updatedBuyer.payment_status !== 'id_check_started' && updatedBuyer.payment_status !== 'authorized') {
          console.log(`✅ Webhook processed! Status changed to: ${updatedBuyer.payment_status}`);
          
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

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // Timeout - webhook didn't fire in time
      console.log(`⚠️  Webhook timeout - still waiting after ${WEBHOOK_TIMEOUT_MS}ms`);

      return sendSuccess(reply, {
        payment_status: 'id_check_pending',
        verification_status: 'id_check_pending',
        message: 'Verification is being processed. Please wait or refresh the page.'
      }, 200);

    } catch (error) {
      console.error('Webhook complete error:', error);
      return sendError(reply, 'Error waiting for webhook completion', 500);
    }
  });

  /**
   * WEBHOOK RETRY: Retry webhook if it failed or timed out
   * Idempotent - safe to call multiple times
   */
  fastify.post('/webhook-retry', {
    ...createRouteSchema({
      tags: ['buyer'],
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
        message: 'Webhook retry initiated. Checking status...',
        should_retry: true,
        retry_after_ms: 3000
      }, 200);

    } catch (error) {
      console.error('Webhook retry error:', error);
      return sendError(reply, 'Webhook retry failed', 500);
    }
  });
}