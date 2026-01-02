import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, sendUnauthorized, authRequired } from '../utils/api-responses.js';
import { createBuyer, getBuyerByAuth, updateBuyerAccount } from '../services/database/buyer-accounts.js';
import { deleteBuyerData, exportBuyerData, validateBuyerOwnership } from '../services/database/ccpa-privacy.js';
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
  // Complete buyer profile (authenticated - after email verification)
  fastify.post('/complete-profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Complete buyer profile after email verification',
      description: 'Creates buyer_accounts entry after user verifies email',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string', minLength: 1 },
          last_name: { type: 'string', minLength: 1 },
          phone: { type: 'string' }
        },
        required: ['first_name', 'last_name']
      },
      response: {
        description: 'Profile completed successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { 
            type: 'object', 
            properties: { 
              id: { type: 'string' },
              buyer_reference_id: { type: 'string' },
              verification_status: { type: 'string' }
            } 
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify user has buyer role
      if (request.user!.role !== 'buyer') {
        return sendError(reply, 'Only buyers can access this endpoint', 403);
      }

      const profileData = buyerRegistrationSchema.parse(request.body) as BuyerRegistration;

      // Check if buyer account already exists
      const existingBuyer = await getBuyerByAuth(request.user!.id);
      if (existingBuyer) {
        return sendError(reply, 'Buyer account already exists', 400);
      }

      // Create buyer account
      const buyer = await createBuyer(request.user!.id, profileData);

      return sendSuccess(reply, {
        id: buyer.id,
        buyer_reference_id: buyer.buyer_reference_id,
        verification_status: buyer.verification_status
      }, 201);

    } catch (error) {
      console.error('Complete buyer profile error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid profile data');
      }
      return sendError(reply, 'Failed to complete buyer profile', 500);
    }
  });

  // Get buyer profile
  fastify.get('/profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Get buyer profile',
      description: 'Retrieve authenticated buyer account information',
      security: authRequired,
      response: {
        description: 'Buyer profile information',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'object', properties: { id: { type: 'string' }, first_name: { type: 'string' }, verification_status: { type: 'string' } } }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'buyer') {
        return sendUnauthorized(reply, 'Buyer access required');
      }

      const buyer = request.user.account_data;
      if (!buyer) {
        return sendError(reply, 'Profile not completed. Please complete your profile first.', 403);
      }

      return sendSuccess(reply, buyer, 200);

    } catch (error) {
      console.error('Get buyer profile error:', error);
      return sendError(reply, 'Failed to get profile', 500);
    }
  });

  // Update buyer profile (only fields in buyerProfileUpdateSchema)
  fastify.put('/profile', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Update buyer profile',
      description: 'Update buyer account information',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string', minLength: 1 },
          last_name: { type: 'string', minLength: 1 },
          phone: { type: 'string', pattern: '^[0-9]{10}$' }
        }
      },
      response: {
        description: 'Profile updated successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'object', properties: { id: { type: 'string' }, first_name: { type: 'string' }, verification_status: { type: 'string' } } }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'buyer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Buyer access required');
      }

      const buyer = request.user.account_data as BuyerAccount;
      const updateData = buyerProfileUpdateSchema.parse(request.body) as BuyerProfileUpdate;
      const buyerId = buyer.id;

      // Update buyer account
      const success = await updateBuyerAccount(buyerId, updateData);
      if (!success) {
        return sendError(reply, 'Failed to update profile', 500);
      }

      // Get updated buyer data
      const updatedBuyer = await getBuyerByAuth(request.user.id);
      return sendSuccess(reply, updatedBuyer, 200);

    } catch (error) {
      console.error('Update buyer profile error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid update data');
      }
      return sendError(reply, 'Failed to update profile', 500);
    }
  });

  // Get verification history (from buyerVerificationHistorySchema)
  fastify.get('/verifications', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Get verification history',
      description: 'Retrieve history of dealer verification requests',
      security: authRequired,
      response: {
        description: 'Verification history',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              buyer_id: { type: 'string', format: 'uuid' },
              buyer_reference_id: { type: 'string' },
              total_verifications: { type: 'integer' },
              verification_events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    compliance_event_id: { type: 'string', format: 'uuid' },
                    dealer_company_name: { type: 'string' },
                    dealer_reference_id: { type: 'string' },
                    age_verified: { type: 'boolean' },
                    address_verified: { type: 'boolean' },
                    address_match_confidence: { type: 'number' },
                    verified_at: { type: 'string', format: 'date-time' },
                    blockchain_transaction_hash: { type: 'string' }
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
      if (!request.user || request.user.account_type !== 'buyer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Buyer access required');
      }

      const buyer = request.user.account_data as BuyerAccount;
      const history = await getVerificationHistory(buyer.id);

      // Format according to buyerVerificationHistorySchema
      const formattedHistory = {
        buyer_id: buyer.id,
        buyer_reference_id: buyer.buyer_reference_id,
        total_verifications: history.length,
        verification_events: history.map(event => ({
          compliance_event_id: event.id,
          dealer_company_name: undefined, // Would need dealer lookup
          dealer_reference_id: event.dealer_reference_id,
          age_verified: event.age_verified,
          address_verified: event.address_verified,
          address_match_confidence: 0, // Would extract from verification_data
          verified_at: event.verified_at,
          blockchain_transaction_hash: event.blockchain_info?.transaction_hash
        }))
      };

      return sendSuccess(reply, formattedHistory, 200);

    } catch (error) {
      console.error('Get verification history error:', error);
      return sendError(reply, 'Failed to get verification history', 500);
    }
  });

  // CCPA data export (follows buyerDataExportSchema)
  fastify.get('/export-data', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Export buyer data (CCPA)',
      description: 'Export all personal data per buyerDataExportSchema',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'buyer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Buyer access required');
      }

      const buyer = request.user.account_data as BuyerAccount;
      const exportData = await exportBuyerData(buyer.id);

      return sendSuccess(reply, exportData, 200);

    } catch (error) {
      console.error('Export data error:', error);
      return sendError(reply, 'Failed to export data', 500);
    }
  });

  // CCPA account deletion (follows buyerDataRequestSchema)
  fastify.delete('/account', {
    ...createRouteSchema({
      tags: ['buyer'],
      summary: 'Delete buyer account (CCPA)',
      description: 'Process CCPA deletion request per buyerDataRequestSchema',
      security: authRequired,
      body: {
        type: 'object',
        properties: {
          request_type: {
            type: 'string',
            enum: ['delete_account']
          }
        },
        required: ['request_type']
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user || request.user.account_type !== 'buyer' || !request.user.account_data) {
        return sendUnauthorized(reply, 'Buyer access required');
      }

      const requestData = buyerDataRequestSchema.parse(request.body) as BuyerDataRequest;
      
      if (requestData.request_type !== 'delete_account') {
        return sendValidationError(reply, 'Invalid request type for this endpoint');
      }

      const buyer = request.user.account_data as BuyerAccount;

      // Validate ownership
      const isOwner = await validateBuyerOwnership(request.user.id, buyer.id);
      if (!isOwner) {
        return sendUnauthorized(reply, 'Access denied');
      }

      // Delete all buyer data
      const deletionSummary = await deleteBuyerData(buyer.id);

      return sendSuccess(reply, {
        deleted_at: deletionSummary.completedAt,
        summary: deletionSummary
      }, 200);

    } catch (error) {
      console.error('Delete account error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid deletion request');
      }
      return sendError(reply, 'Failed to delete account', 500);
    }
  });
}