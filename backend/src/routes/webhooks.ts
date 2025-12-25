import { FastifyInstance } from 'fastify';
import { getVerifiedData, verifyPersonaWebhook } from '../services/persona.js';
import { verifyWebhookSignature } from '../services/stripe.js';
import { getUserById, createPIIRecord } from '../services/supabase.js';
import { encrypt } from '../services/encryption.js';
import { calculateClaims, issueCredential, serializeCredential } from '../services/polygonid.js';
import { sendVerificationComplete } from '../services/email.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // Persona webhook - identity verification complete
  fastify.post('/persona', async (request, reply) => {
    try {
      const signature = request.headers['persona-signature'] as string;
      const payload = JSON.stringify(request.body);

      // Verify webhook signature
      const isValid = verifyPersonaWebhook(payload, signature);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      const event = request.body as any;

      // Handle inquiry.completed event
      if (event.data?.type === 'inquiry' && event.data?.attributes?.status === 'approved') {
        const inquiryId = event.data.id;
        const userId = event.data.attributes['reference-id'];

        // Get verified data from Persona
        const verifiedData = await getVerifiedData(inquiryId);
        
        if (!verifiedData) {
          return reply.status(400).send({ error: 'No verified data available' });
        }

        // Get user
        const user = await getUserById(userId);
        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Calculate claims from DOB
        const claims = calculateClaims(verifiedData.birthdate);

        // Issue Polygon ID credential
        const credential = await issueCredential(userId, claims);
        const credentialJson = serializeCredential(credential);

        // Encrypt and store PII + credential
        await createPIIRecord({
          user_id: userId,
          encrypted_name: encrypt(`${verifiedData.first_name} ${verifiedData.last_name}`),
          encrypted_dob: encrypt(verifiedData.birthdate),
          encrypted_dl_number: encrypt(verifiedData.identification_number),
          encrypted_dl_expiration: encrypt(verifiedData.identification_expiration_date),
          encrypted_address: encrypt(JSON.stringify({
            street_1: verifiedData.address_street_1,
            street_2: verifiedData.address_street_2,
            city: verifiedData.address_city,
            state: verifiedData.address_subdivision,
            postal_code: verifiedData.address_postal_code,
          })),
          encrypted_polygon_credential: encrypt(credentialJson),
          verified_at: new Date().toISOString(),
          verification_expires_at: verifiedData.identification_expiration_date,
          verification_provider: 'persona',
          verification_session_id: inquiryId,
        });

        // Send confirmation email
        await sendVerificationComplete(user.email);

        request.log.info(`User ${userId} verification complete`);
      }

      return reply.send({ received: true });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Stripe webhook - subscription events
  fastify.post('/stripe', async (request, reply) => {
    try {
      const signature = request.headers['stripe-signature'] as string;
      const payload = request.rawBody as string;

      // Verify webhook signature
      const event = verifyWebhookSignature(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      // Handle subscription events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          // Update customer subscription status
          request.log.info(`Subscription ${event.type}`, event.data.object);
          break;

        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          request.log.info('Subscription deleted', event.data.object);
          break;

        case 'invoice.payment_succeeded':
          // Reset monthly query count on successful payment
          request.log.info('Payment succeeded', event.data.object);
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          request.log.info('Payment failed', event.data.object);
          break;

        default:
          request.log.info(`Unhandled event type ${event.type}`);
      }

      return reply.send({ received: true });
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ error: 'Webhook error' });
    }
  });
}