import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';
import { createDealer, getDealerByAuth, updateDealerAccount, setupDealerSubscription, useDealerCredit, addDealerCredits } from '../services/database/dealer-accounts.js';
import { getDealerVerificationHistory } from '../services/database/compliance-events.js';
import { getDealerPaymentHistory } from '../services/database/payment-events.js';
import { generateApiKey, hashApiKey } from '../services/encryption.js';
import { 
  dealerRegistrationSchema, 
  dealerProfileUpdateSchema, 
  dealerSubscriptionUpdateSchema,
  dealerCreditPurchaseSchema,
  type DealerRegistration,
  type DealerProfileUpdate,
  type DealerAccount
} from '@ca2achain/shared';

export default async function dealerRoutes(fastify: FastifyInstance) {
  // Complete dealer profile - NO payment/subscription
  fastify.post('/complete-profile', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Complete dealer profile',
      description: 'Creates dealer_accounts entry with basic info only',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          company_name: { type: 'string', minLength: 2 },
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
          business_phone: { type: 'string', pattern: '^[0-9]{10}$' }
        },
        required: ['company_name', 'business_address', 'business_phone']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (request.user!.role !== 'dealer') {
        return sendError(reply, 'Only dealers can access this endpoint', 403);
      }

      const registrationData = dealerRegistrationSchema.parse(request.body) as DealerRegistration;
      const existingDealer = await getDealerByAuth(request.user!.id);
      
      if (existingDealer) {
        return sendError(reply, 'Profile already exists', 400);
      }

      const completeRegistrationData = {
        ...registrationData,
        business_email: request.user!.email
      };

      const dealer = await createDealer(request.user!.id, completeRegistrationData);

      return sendSuccess(reply, {
        id: dealer.id,
        company_name: dealer.company_name,
        dealer_reference_id: dealer.dealer_reference_id,
        subscription_status: null
      }, 201);
    } catch (error) {
      console.error('Complete profile error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid profile data');
      }
      return sendError(reply, 'Failed to complete profile', 500);
    }
  });

  // Setup subscription (future workflow - not used in current registration flow)
  fastify.post('/subscription/setup', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Setup dealer subscription',
      description: 'Activate subscription and generate API key',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Dealer profile required', 403);
      }

      const dealer = request.user.account_data as DealerAccount;
      
      if (dealer.subscription_status) {
        return sendError(reply, 'Subscription already active', 400);
      }

      const { subscription_tier } = dealerSubscriptionUpdateSchema.parse(request.body);

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Setup subscription and create API key
      const updatedDealer = await setupDealerSubscription(dealer.id, subscription_tier, apiKeyHash);

      return sendSuccess(reply, {
        ...updatedDealer,
        api_key: apiKey // Return API key once
      }, 200);
    } catch (error) {
      console.error('Subscription setup error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid subscription tier');
      }
      return sendError(reply, 'Failed to setup subscription', 500);
    }
  });

  // Update subscription tier (future workflow)
  fastify.patch('/subscription', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Update subscription tier',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Dealer account required', 403);
      }

      const dealer = request.user.account_data as DealerAccount;
      
      if (!dealer.subscription_status) {
        return sendError(reply, 'No active subscription', 400);
      }

      const { subscription_tier } = dealerSubscriptionUpdateSchema.parse(request.body);
      
      // Update tier and recalculate credits
      const tierCredits = { 1: 100, 2: 500, 3: 10000 };
      const updatedDealer = await updateDealerAccount(dealer.id, { 
        subscription_tier,
        credits_purchased: tierCredits[subscription_tier as keyof typeof tierCredits]
      } as any);

      return sendSuccess(reply, updatedDealer, 200);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid subscription tier');
      }
      return sendError(reply, 'Failed to update subscription', 500);
    }
  });

  // Get dealer profile
  fastify.get('/profile', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get dealer profile',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Profile not completed', 403);
      }
      return sendSuccess(reply, request.user.account_data, 200);
    } catch (error) {
      return sendError(reply, 'Failed to retrieve profile', 500);
    }
  });

  // Update dealer profile
  fastify.patch('/profile', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Update dealer profile',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Profile not found', 404);
      }

      const updateData = dealerProfileUpdateSchema.parse(request.body) as DealerProfileUpdate;
      const dealer = request.user.account_data as DealerAccount;
      const updatedDealer = await updateDealerAccount(dealer.id, updateData);

      return sendSuccess(reply, updatedDealer, 200);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid update data');
      }
      return sendError(reply, 'Failed to update profile', 500);
    }
  });

  // Purchase credits
  fastify.post('/credits/purchase', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Purchase additional credits',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Dealer account required', 403);
      }

      const dealer = request.user.account_data as DealerAccount;
      
      if (!dealer.subscription_status) {
        return sendError(reply, 'Active subscription required', 403);
      }

      const { credit_amount } = dealerCreditPurchaseSchema.parse(request.body);
      const updatedDealer = await addDealerCredits(dealer.id, credit_amount);

      return sendSuccess(reply, updatedDealer, 200);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid credit amount');
      }
      return sendError(reply, 'Failed to purchase credits', 500);
    }
  });

  // Get verification history
  fastify.get('/verification-history', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get dealer verification history',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Profile not found', 404);
      }

      const dealer = request.user.account_data as DealerAccount;
      const history = await getDealerVerificationHistory(dealer.id);

      return sendSuccess(reply, history, 200);
    } catch (error) {
      return sendError(reply, 'Failed to retrieve verification history', 500);
    }
  });

  // Get payment history
  fastify.get('/payment-history', {
    ...createRouteSchema({
      tags: ['dealer'],
      summary: 'Get dealer payment history',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.role !== 'dealer' || !request.user.account_data) {
        return sendError(reply, 'Profile not found', 404);
      }

      const dealer = request.user.account_data as DealerAccount;
      const payments = await getDealerPaymentHistory(dealer.id);

      return sendSuccess(reply, payments, 200);
    } catch (error) {
      return sendError(reply, 'Failed to retrieve payment history', 500);
    }
  });
}