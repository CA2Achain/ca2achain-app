import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, sendUnauthorized, authRequired, apiKeyRequired } from '../utils/api-responses.js';
import { createDealer, getDealerByAuth, updateDealerAccount, useDealerCredit, addDealerCredits } from '../services/database/dealer-accounts.js';
import { getDealerVerificationHistory } from '../services/database/compliance-events.js';
import { getDealerPaymentHistory } from '../services/database/payment-events.js';
import { generateApiKey, hashApiKey } from '../services/encryption.js';
import { sendDealerWelcome, sendDealerApiKey } from '../services/email.js';
import { 
  dealerRegistrationSchema, 
  dealerProfileUpdateSchema, 
  dealerSubscriptionUpdateSchema,
  dealerCreditPurchaseSchema,
  type DealerRegistration,
  type DealerProfileUpdate,
  type DealerSubscriptionUpdate,
  type DealerCreditPurchase,
  type DealerAccount
} from '@ca2achain/shared';

export default async function dealerRoutes(fastify: FastifyInstance) {
  // Dealer registration
  fastify.post('/register', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Register new dealer account',
      description: 'Create a new dealer account with business information',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          company_name: { type: 'string', minLength: 2 },
          business_email: { type: 'string', format: 'email' },
          business_address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zip_code: { type: 'string' }
            },
            required: ['street', 'city', 'state', 'zip_code']
          },
          business_phone: { type: 'string', pattern: '^[0-9]{10}$' },
          subscription_tier: { type: 'integer', minimum: 1, maximum: 3, default: 1 }
        },
        required: ['company_name', 'business_email', 'business_address', 'business_phone']
      },
      response: {
        description: 'Dealer account created successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/DealerAccount' }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const registrationData = dealerRegistrationSchema.parse(request.body) as DealerRegistration;

      // Check if dealer already exists for this auth user
      const existingDealer = await getDealerByAuth(request.user!.id);
      if (existingDealer) {
        return sendError(reply, 'Dealer account already exists', 400);
      }

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Create dealer account
      const dealer = await createDealer(request.user!.id, registrationData, apiKeyHash);

      // Send welcome email
      await sendDealerWelcome(registrationData.business_email, registrationData.company_name, registrationData.subscription_tier || 1);

      // Send API key separately for security
      await sendDealerApiKey(registrationData.business_email, registrationData.company_name, apiKey);

      return sendSuccess(reply, dealer, 201);

    } catch (error) {
      console.error('Dealer registration error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid registration data');
      }
      return sendError(reply, 'Failed to create dealer account', 500);
    }
  });

  // Get dealer profile
  fastify.get('/profile', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get dealer profile',
      description: 'Retrieve authenticated dealer account information',
      security: authRequired,
      response: {
        description: 'Dealer profile information',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/DealerAccount' }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer') {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data;
      if (!dealer) {
        return sendError(reply, 'Dealer account not found', 404);
      }

      return sendSuccess(reply, dealer, 200);

    } catch (error) {
      console.error('Get dealer profile error:', error);
      return sendError(reply, 'Failed to get profile', 500);
    }
  });

  // Update dealer profile
  fastify.put('/profile', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Update dealer profile',
      description: 'Update dealer account information',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          company_name: { type: 'string', minLength: 1 },
          business_email: { type: 'string', format: 'email' },
          business_address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zip_code: { type: 'string' }
            }
          },
          business_phone: { type: 'string', pattern: '^[0-9]{10}$' },
          subscription_tier: { type: 'integer', minimum: 1, maximum: 3 },
          payment_info: {
            type: 'object',
            properties: {
              credit_card_info: { type: 'object' },
              stripe_info: { type: 'object' }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      const updateData = dealerProfileUpdateSchema.parse(request.body) as DealerProfileUpdate;
      const dealerId = dealer.id;

      // Update dealer account
      const success = await updateDealerAccount(dealerId, updateData);
      if (!success) {
        return sendError(reply, 'Failed to update profile', 500);
      }

      // Get updated dealer data
      const updatedDealer = await getDealerByAuth(request.user.id);
      if (!updatedDealer) {
        return sendError(reply, 'Updated dealer data not found', 500);
      }
      return sendSuccess(reply, updatedDealer, 200);

    } catch (error) {
      console.error('Update dealer profile error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid update data');
      }
      return sendError(reply, 'Failed to update profile', 500);
    }
  });

  // Get billing summary
  fastify.get('/billing', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get billing summary',
      description: 'Get dealer billing and credit information per dealerBillingSummarySchema',
      security: authRequired,
      response: {
        description: 'Billing summary',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              subscription_tier: { type: 'integer' },
              subscription_status: { type: 'string' },
              credits_available: { type: 'integer' },
              credits_used: { type: 'integer' },
              credits_expire_at: { type: 'string', format: 'date-time' },
              next_billing_date: { type: 'string' },
              payment_method: {
                type: 'object',
                properties: {
                  method: { type: 'string' },
                  last4: { type: 'string' },
                  brand: { type: 'string' }
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
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      
      // Calculate available credits
      const creditsAvailable = (dealer.credits_purchased + dealer.additional_credits_purchased) - dealer.credits_used;
      
      // Format according to dealerBillingSummarySchema
      const billingSummary = {
        subscription_tier: dealer.subscription_tier,
        subscription_status: dealer.subscription_status,
        credits_available: Math.max(0, creditsAvailable),
        credits_used: dealer.credits_used,
        credits_expire_at: dealer.credits_expire_at,
        next_billing_date: dealer.billing_due_date,
        payment_method: dealer.payment_info?.credit_card_info ? {
          method: dealer.payment_info.credit_card_info.method,
          last4: dealer.payment_info.credit_card_info.last4,
          brand: dealer.payment_info.credit_card_info.brand
        } : undefined
      };

      return sendSuccess(reply, billingSummary, 200);

    } catch (error) {
      console.error('Get billing summary error:', error);
      return sendError(reply, 'Failed to get billing information', 500);
    }
  });

  // Update subscription (follows dealerSubscriptionUpdateSchema)
  fastify.put('/subscription', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Update subscription tier',
      description: 'Update dealer subscription tier and payment method',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          subscription_tier: { type: 'integer', minimum: 1, maximum: 3 },
          payment_info: {
            type: 'object',
            properties: {
              credit_card_info: { type: 'object' },
              stripe_info: { type: 'object' }
            }
          }
        },
        required: ['subscription_tier', 'payment_info']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      const subscriptionData = dealerSubscriptionUpdateSchema.parse(request.body) as DealerSubscriptionUpdate;
      const dealerId = dealer.id;

      // Update subscription
      const success = await updateDealerAccount(dealerId, {
        subscription_tier: subscriptionData.subscription_tier,
        payment_info: subscriptionData.payment_info
      });

      if (!success) {
        return sendError(reply, 'Failed to update subscription', 500);
      }

      const updatedDealer = await getDealerByAuth(request.user.id);
      if (!updatedDealer) {
        return sendError(reply, 'Updated dealer data not found', 500);
      }
      return sendSuccess(reply, updatedDealer, 200);

    } catch (error) {
      console.error('Update subscription error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid subscription data');
      }
      return sendError(reply, 'Failed to update subscription', 500);
    }
  });

  // Purchase additional credits (follows dealerCreditPurchaseSchema)
  fastify.post('/credits', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Purchase additional credits',
      description: 'Purchase additional verification credits',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          credit_amount: { type: 'integer', minimum: 1, maximum: 10000 },
          payment_info: {
            type: 'object',
            properties: {
              credit_card_info: { type: 'object' },
              stripe_info: { type: 'object' }
            }
          }
        },
        required: ['credit_amount', 'payment_info']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      const creditData = dealerCreditPurchaseSchema.parse(request.body) as DealerCreditPurchase;
      const dealerId = dealer.id;

      // Add credits to account
      const success = await addDealerCredits(dealerId, creditData.credit_amount);
      if (!success) {
        return sendError(reply, 'Failed to add credits', 500);
      }

      const updatedDealer = await getDealerByAuth(request.user.id);
      if (!updatedDealer) {
        return sendError(reply, 'Updated dealer data not found', 500);
      }
      return sendSuccess(reply, {
        credits_added: creditData.credit_amount,
        new_balance: (updatedDealer.credits_purchased + updatedDealer.additional_credits_purchased) - updatedDealer.credits_used
      }, 200);

    } catch (error) {
      console.error('Purchase credits error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid credit purchase data');
      }
      return sendError(reply, 'Failed to purchase credits', 500);
    }
  });

  // Get verification history
  fastify.get('/verifications', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get verification history',
      description: 'Retrieve dealer verification history with pagination',
      security: authRequired,
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      const history = await getDealerVerificationHistory(dealer.id);

      return sendSuccess(reply, history, 200);

    } catch (error) {
      console.error('Get verification history error:', error);
      return sendError(reply, 'Failed to get verification history', 500);
    }
  });

  // Regenerate API key
  fastify.post('/api-key/regenerate', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Regenerate API key',
      description: 'Generate a new API key for dealer account',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'dealer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Dealer access required');
      }

      const dealer = request.user.account_data as DealerAccount;
      
      // Generate new API key
      const newApiKey = generateApiKey();
      const apiKeyHash = hashApiKey(newApiKey);

      // Update dealer account with new API key hash
      const success = await updateDealerAccount(dealer.id, {
        api_key_hash: apiKeyHash,
        api_key_created_at: new Date().toISOString()
      });

      if (!success) {
        return sendError(reply, 'Failed to regenerate API key', 500);
      }

      // Send new API key via email
      await sendDealerApiKey(dealer.business_email, dealer.company_name, newApiKey);

      return sendSuccess(reply, {
        message: 'New API key generated and sent via email',
        api_key_created_at: new Date().toISOString()
      }, 200);

    } catch (error) {
      console.error('Regenerate API key error:', error);
      return sendError(reply, 'Failed to regenerate API key', 500);
    }
  });
}