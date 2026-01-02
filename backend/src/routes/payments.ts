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
  verifyBuyerPayment,
  createDealerSubscriptionCheckout,
  verifyDealerSubscription,
  verifyWebhookSignature 
} from '../services/service-resolver.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  customerPaymentHistorySchema,
  type CreatePayment,
  type Payment,
  type BuyerAccount,
  type DealerAccount
} from '@ca2achain/shared';

export default async function paymentsRoutes(fastify: FastifyInstance) {
  // Create buyer payment session
  fastify.post('/buyer/checkout', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Create buyer payment session',
      description: 'Create Stripe checkout session for buyer $39 verification fee',
      security: authRequired,
      response: {
        description: 'Payment session created',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              checkout_url: { type: 'string', format: 'uri' },
              session_id: { type: 'string' },
              payment_id: { type: 'string', format: 'uuid' }
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
      if (buyer.payment_status === 'succeeded') {
        return sendError(reply, 'Payment already completed', 400);
      }

      // Create payment record first (following createPaymentSchema)
      const paymentData: CreatePayment = {
        buyer_id: buyer.id,
        transaction_type: 'verification',
        amount_cents: 3900, // $39
        customer_reference_id: buyer.buyer_reference_id,
        payment_provider_info: {
          stripe_info: {
            stripe_customer_id: `customer_${buyer.buyer_reference_id}`
          }
        }
      };

      const payment = await createPaymentEvent(paymentData);

      // Create Stripe checkout session (mock)
      const session = await createBuyerCheckoutSession(
        request.user.email,
        buyer.id
      );

      return sendSuccess(reply, {
        checkout_url: session.url,
        session_id: session.id,
        payment_id: payment.id
      }, 200);

    } catch (error) {
      console.error('Create buyer checkout error:', error);
      return sendError(reply, 'Failed to create payment session', 500);
    }
  });

  // Create dealer subscription payment
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

      // Explicit type checking for dealer properties
      if (!dealer || typeof dealer !== 'object' || !('dealer_reference_id' in dealer)) {
        return sendError(reply, 'Invalid dealer account structure', 500);
      }

      // Extract dealer reference ID with explicit casting
      const dealerReferenceId = dealer.dealer_reference_id as string;
      if (!dealerReferenceId) {
        return sendError(reply, 'Missing dealer reference ID', 500);
      }

      // Calculate subscription amount based on tier
      const tierPricing = { 1: 19900, 2: 99900, 3: 379900 }; // $199, $999, $3799
      const amount = tierPricing[subscription_tier as keyof typeof tierPricing];

      // Create payment record
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

      // Create Stripe subscription checkout (mock)
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

  // Get payment history for authenticated user
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
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    transaction_type: { type: 'string', enum: ['verification', 'subscription'] },
                    amount_cents: { type: 'integer' },
                    status: { type: 'string' },
                    payment_timestamp: { type: 'string', format: 'date-time' }
                  }
                }
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

      // Get payments based on account type (using our database functions)
      if (request.user.role === 'buyer') {
        const buyerData = accountData as BuyerAccount;
        payments = await getBuyerPaymentHistory(buyerData.id);
        customerReferenceId = buyerData.buyer_reference_id;
      } else {
        const dealerData = accountData as DealerAccount;
        // Explicit property extraction for dealer reference ID
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

      // Format response following customerPaymentHistorySchema structure
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
          account_active: true // Account is active since user is authenticated
        }))
      };

      return sendSuccess(reply, response, 200);

    } catch (error) {
      console.error('Get payment history error:', error);
      return sendError(reply, 'Failed to get payment history', 500);
    }
  });

  // Verify payment completion
  fastify.post('/verify', {
    ...createRouteSchema({
      tags: ['payments'],
      summary: 'Verify payment completion',
      description: 'Verify payment session completion and update status',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          payment_id: { type: 'string', format: 'uuid' }
        },
        required: ['session_id', 'payment_id']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { session_id, payment_id } = request.body as { session_id: string; payment_id: string };

      // Verify payment with Stripe (mock)
      let paymentResult: any = null;
      
      if (request.user?.role === 'buyer') {
        paymentResult = await verifyBuyerPayment(session_id);
      } else if (request.user?.role === 'dealer') {
        paymentResult = await verifyDealerSubscription(session_id);
      }

      if (paymentResult) {
        // Update payment status using our database function
        await updatePaymentStatus(payment_id, 'succeeded', {
          stripe_info: {
            session_id,
            verified_at: new Date().toISOString()
          }
        });

        return sendSuccess(reply, {
          payment_id,
          status: 'succeeded',
          verified_at: new Date().toISOString()
        }, 200);
      } else {
        await updatePaymentStatus(payment_id, 'failed');
        return sendError(reply, 'Payment verification failed', 400);
      }

    } catch (error) {
      console.error('Verify payment error:', error);
      return sendError(reply, 'Failed to verify payment', 500);
    }
  });
}