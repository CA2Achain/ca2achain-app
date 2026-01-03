import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';
import { getBuyerByAuth } from '../services/database/buyer-accounts.js';
import { 
  personaInquiryRequestSchema,
  personaHostedUrlResponseSchema,
  type PersonaInquiryRequest,
  type PersonaHostedUrlResponse
} from '@ca2achain/shared';
import { createBuyerInquiry } from '../services/mocks/persona.js';

export default async function personaRoutes(fastify: FastifyInstance) {
  // Create Persona inquiry for buyer identity verification
  fastify.post('/inquiry', {
    ...createRouteSchema({
      tags: ['persona'],
      summary: 'Create Persona inquiry for identity verification',
      description: 'Initiates a Persona identity verification inquiry. Buyer must be authenticated.',
      security: authRequired,
      response: {
        description: 'Persona inquiry created with hosted verification URL',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              inquiry_id: { type: 'string', description: 'Persona inquiry ID' },
              hosted_url: { type: 'string', format: 'uri', description: 'URL to redirect buyer to for verification' },
            },
            required: ['inquiry_id', 'hosted_url']
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify buyer role
      if (!request.user || request.user.role !== 'buyer') {
        return sendError(reply, 'Only buyers can create identity verification inquiries', 403);
      }

      // Get buyer account
      const buyer = await getBuyerByAuth(request.user.id);
      if (!buyer) {
        return sendError(reply, 'Buyer profile not found. Please complete your profile first.', 404);
      }

      // Create Persona inquiry
      const inquiry = await createBuyerInquiry(buyer.id);

      // Generate hosted URL (in real implementation, use Persona's SDK)
      const hostedUrl = `${process.env.FRONTEND_URL}/buyer/verify-identity/persona?inquiry_id=${inquiry.id}&session_token=${inquiry.attributes['session-token']}`;

      const response: PersonaHostedUrlResponse = {
        inquiry_id: inquiry.id,
        hosted_url: hostedUrl,
        session_token: inquiry.attributes['session-token']
      };

      console.log(`✅ Created Persona inquiry ${inquiry.id} for buyer ${buyer.buyer_reference_id}`);

      return sendSuccess(reply, response, 201);

    } catch (error) {
      console.error('Persona inquiry creation error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid inquiry request data');
      }
      return sendError(reply, 'Failed to create identity verification inquiry', 500);
    }
  });

  // Webhook endpoint for Persona to notify us of verification completion
  fastify.post('/webhook', {
    ...createRouteSchema({
      tags: ['persona'],
      summary: 'Persona webhook endpoint',
      description: 'Receives verification completion events from Persona. No authentication required.',
      body: {
        type: 'object',
        additionalProperties: true
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = request.body as any;

      // Verify webhook signature (in production, verify with Persona's public key)
      console.log(`📨 Received Persona webhook for inquiry ${payload.data?.inquiry_id}`);

      // In development with mocks, we accept all webhooks
      // In production, verify signature and status before processing

      const inquiryId = payload.data?.inquiry_id;
      const status = payload.data?.status;
      const referenceId = payload.data?.attributes?.['reference-id'];

      if (!inquiryId || !status || !referenceId) {
        return sendError(reply, 'Invalid webhook payload', 400);
      }

      // TODO: Process webhook
      // - Retrieve buyer by reference_id
      // - Store inquiry status and verified data in buyer_secrets
      // - Create encryption key in Supabase Vault
      // - Update buyer verification status

      console.log(`✅ Persona webhook processed: inquiry ${inquiryId} status ${status}`);

      return sendSuccess(reply, { received: true }, 200);

    } catch (error) {
      console.error('Persona webhook error:', error);
      return sendError(reply, 'Webhook processing failed', 500);
    }
  });
}