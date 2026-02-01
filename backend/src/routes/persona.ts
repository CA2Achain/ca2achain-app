import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';
import { getBuyerByAuth, getBuyerById, updateBuyerAccount } from '../services/database/buyer-accounts.js';
import { updatePaymentStatus } from '../services/database/payment-events.js';
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

      console.log(`📨 Received Persona webhook for inquiry ${payload.data?.inquiry_id}`);

      const inquiryId = payload.data?.inquiry_id;
      const status = payload.data?.status;
      const referenceId = payload.data?.attributes?.['reference-id'];

      if (!inquiryId || !status || !referenceId) {
        return sendError(reply, 'Invalid webhook payload', 400);
      }

      // Import what we need
      const { getInquiryStatus } = await import('../services/mocks/persona.js');
      const { captureBuyerPayment, refundBuyerPayment } = await import('../services/service-resolver.js');

      // Get buyer and inquiry data
      const buyer = await getBuyerById(referenceId);
      if (!buyer) {
        console.error(`❌ Buyer not found for reference ID: ${referenceId}`);
        return sendError(reply, 'Buyer not found', 404);
      }

      const inquiryStatus = await getInquiryStatus(inquiryId);

      console.log(`📋 Webhook processing:`);
      console.log(`   Inquiry: ${inquiryId}`);
      console.log(`   Status: ${status}`);
      console.log(`   Buyer: ${buyer.buyer_reference_id}`);

      // SAFE CAPTURE FLOW: Process ID result
      if (status === 'passed' || inquiryStatus?.decision === 'approved') {
        console.log(`✅ ID VERIFICATION PASSED`);
        console.log(`   Next Action: CAPTURE PAYMENT`);

        if (!buyer.stripe_payment_intent_id) {
          console.error(`❌ No payment intent found for buyer`);
          return sendError(reply, 'No payment found', 400);
        }

        // CAPTURE the payment (actually charge the card)
        try {
          const captureResult = await captureBuyerPayment(buyer.stripe_payment_intent_id);
          console.log(`✅ Payment captured: $${captureResult.amount / 100}`);

          // Update buyer account - VERIFIED
          await updateBuyerAccount(buyer.id, {
            payment_status: 'completed',
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            verification_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });

          console.log(`✅ Buyer ${buyer.buyer_reference_id} is now VERIFIED`);

        } catch (captureError) {
          console.error(`❌ Payment capture failed:`, captureError);
          // Log error but still respond success to webhook
        }

      } else {
        console.log(`❌ ID VERIFICATION FAILED`);
        console.log(`   Next Action: RELEASE HOLD`);

        if (!buyer.stripe_payment_intent_id) {
          console.error(`❌ No payment intent found`);
          return sendError(reply, 'No payment found', 400);
        }

        // RELEASE the authorized hold (no charge, no refund needed)
        try {
          const refundResult = await refundBuyerPayment(buyer.stripe_payment_intent_id);
          console.log(`✅ Authorized hold released (no charge made)`);

          // Update buyer account - REJECTED
          await updateBuyerAccount(buyer.id, {
            payment_status: 'authorized_refunded',
            verification_status: 'rejected',
            payment_error_message: 'ID verification failed. Authorized hold released. You can retry.'
          });

          console.log(`⚠️ Buyer ${buyer.buyer_reference_id} ID verification REJECTED`);

        } catch (refundError) {
          console.error(`❌ Hold release failed:`, refundError);
        }
      }

      console.log(`✅ Persona webhook processed successfully`);

      return sendSuccess(reply, { received: true, processed: true }, 200);

    } catch (error) {
      console.error('Persona webhook error:', error);
      return sendError(reply, 'Webhook processing failed', 500);
    }
  });
}