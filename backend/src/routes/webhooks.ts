import { FastifyInstance } from 'fastify';
import { createRouteSchema, sendSuccess, sendError } from '../utils/api-responses.js';
import { updatePaymentStatus } from '../services/database/payment-events.js';
import { verifyWebhookSignature } from '../services/service-resolver.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // Stripe payment webhook handler
  fastify.post('/stripe', createRouteSchema({
    tags: ['webhooks'],
    summary: 'Stripe webhook handler',
    description: 'Handle Stripe payment webhook events for payment status updates',
    body: {
      type: 'object',
      description: 'Stripe webhook event payload',
      additionalProperties: true
    },
    response: {
      description: 'Webhook processed successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {
          type: 'object',
          properties: {
            received: { type: 'boolean' },
            event_type: { type: 'string' },
            processed_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }), async (request, reply) => {
    try {
      const stripeEvent = request.body as any;
      const signature = request.headers['stripe-signature'] as string;

      // Verify webhook signature (mock verification for now)
      const isValidSignature = verifyWebhookSignature(
        JSON.stringify(request.body),
        signature
      );

      if (!isValidSignature) {
        return sendError(reply, 'Invalid webhook signature', 401);
      }

      const processedAt = new Date().toISOString();

      // Handle different Stripe event types
      switch (stripeEvent.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = stripeEvent.data.object;
          
          // Update payment status using our database function
          await updatePaymentStatus(
            paymentIntent.metadata?.payment_id || paymentIntent.id,
            'succeeded',
            {
              stripe_info: {
                payment_intent_id: paymentIntent.id,
                amount_received: paymentIntent.amount_received,
                payment_method: paymentIntent.payment_method,
                processed_at: processedAt
              }
            }
          );

          return sendSuccess(reply, {
            received: true,
            event_type: 'payment_intent.succeeded',
            processed_at: processedAt
          }, 200);
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = stripeEvent.data.object;
          
          await updatePaymentStatus(
            paymentIntent.metadata?.payment_id || paymentIntent.id,
            'failed',
            {
              stripe_info: {
                payment_intent_id: paymentIntent.id,
                failure_reason: paymentIntent.last_payment_error?.message,
                processed_at: processedAt
              }
            }
          );

          return sendSuccess(reply, {
            received: true,
            event_type: 'payment_intent.payment_failed',
            processed_at: processedAt
          }, 200);
        }

        case 'checkout.session.completed': {
          const session = stripeEvent.data.object;
          
          // Handle successful checkout completion
          if (session.metadata?.payment_id) {
            await updatePaymentStatus(
              session.metadata.payment_id,
              'succeeded',
              {
                stripe_info: {
                  session_id: session.id,
                  customer: session.customer,
                  payment_status: session.payment_status,
                  processed_at: processedAt
                }
              }
            );
          }

          return sendSuccess(reply, {
            received: true,
            event_type: 'checkout.session.completed',
            processed_at: processedAt
          }, 200);
        }

        case 'invoice.payment_succeeded': {
          const invoice = stripeEvent.data.object;
          
          // Handle subscription payment success
          if (invoice.metadata?.payment_id) {
            await updatePaymentStatus(
              invoice.metadata.payment_id,
              'succeeded',
              {
                stripe_info: {
                  invoice_id: invoice.id,
                  subscription_id: invoice.subscription,
                  amount_paid: invoice.amount_paid,
                  processed_at: processedAt
                }
              }
            );
          }

          return sendSuccess(reply, {
            received: true,
            event_type: 'invoice.payment_succeeded',
            processed_at: processedAt
          }, 200);
        }

        case 'invoice.payment_failed': {
          const invoice = stripeEvent.data.object;
          
          if (invoice.metadata?.payment_id) {
            await updatePaymentStatus(
              invoice.metadata.payment_id,
              'failed',
              {
                stripe_info: {
                  invoice_id: invoice.id,
                  subscription_id: invoice.subscription,
                  failure_reason: invoice.last_finalization_error?.message,
                  processed_at: processedAt
                }
              }
            );
          }

          return sendSuccess(reply, {
            received: true,
            event_type: 'invoice.payment_failed',
            processed_at: processedAt
          }, 200);
        }

        default: {
          // Log unhandled event types but still return success
          console.log(`Unhandled Stripe webhook event: ${stripeEvent.type}`);
          
          return sendSuccess(reply, {
            received: true,
            event_type: stripeEvent.type,
            processed_at: processedAt
          }, 200);
        }
      }

    } catch (error) {
      console.error('Stripe webhook error:', error);
      return sendError(reply, 'Webhook processing failed', 500);
    }
  });

  // Persona webhook handler (for future identity verification webhooks)
  fastify.post('/persona', createRouteSchema({
    tags: ['webhooks'],
    summary: 'Persona webhook handler',
    description: 'Handle Persona identity verification webhook events',
    body: {
      type: 'object',
      description: 'Persona webhook event payload',
      additionalProperties: true
    }
  }), async (request, reply) => {
    try {
      const personaEvent = request.body as any;
      
      // For now, just log the event (Persona integration will be implemented later)
      console.log('Persona webhook received:', {
        type: personaEvent.type,
        inquiry_id: personaEvent.data?.id,
        status: personaEvent.data?.attributes?.status
      });

      return sendSuccess(reply, {
        received: true,
        event_type: personaEvent.type,
        processed_at: new Date().toISOString()
      }, 200);

    } catch (error) {
      console.error('Persona webhook error:', error);
      return sendError(reply, 'Webhook processing failed', 500);
    }
  });

  // Health check for webhook endpoints
  fastify.get('/health', async (request, reply) => {
    return sendSuccess(reply, {
      webhook_service: 'healthy',
      endpoints: [
        '/webhooks/stripe',
        '/webhooks/persona'
      ],
      timestamp: new Date().toISOString()
    }, 200);
  });
}