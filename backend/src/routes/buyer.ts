import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, sendUnauthorized, authRequired } from '../utils/api-responses.js';
import { createBuyer, getBuyerByAuth, updateBuyerAccount } from '../services/database/buyer-accounts.js';
import { deleteBuyerData, exportBuyerData } from '../services/database/ccpa-privacy.js';
import { getVerificationHistory } from '../services/database/compliance-events.js';
import { 
  buyerRegistrationSchema, 
  buyerProfileUpdateSchema, 
  buyerDataRequestSchema,
  type BuyerRegistration, 
  type BuyerProfileUpdate,
  type BuyerDataRequest,
  type BuyerAccount
} from '@ca2achain/shared';

export default async function buyerRoutes(fastify: FastifyInstance) {
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
}