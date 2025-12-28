import { FastifyInstance } from 'fastify';
import { 
  verifyPersonaWebhook, 
  getVerifiedPersonaData 
} from '../services/mocks/persona.js';
import { verifyWebhookSignature, getSubscriptionDetails } from '../services/service-resolver.js';
import { 
  getBuyerById, 
  updateBuyerAccount,
  createBuyerSecrets,
  getDealerById,
  updateDealerAccount
} from '../services/supabase.js';
import { encryptPersonaData, encryptPrivadoCredential, generateEncryptionKeyId } from '../services/encryption.js';
import { issuePrivadoCredential } from '../services/polygonid.js';
import { sendBuyerVerificationComplete, sendDealerSubscriptionConfirmed } from '../services/email.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
  
  // Persona webhook - buyer identity verification events
  fastify.post('/persona', async (request, reply) => {
    try {
      const signature = request.headers['persona-signature'] as string;
      const payload = JSON.stringify(request.body);

      // Verify webhook signature (basic implementation)
      const isValid = verifyPersonaWebhook(payload, signature);
      if (!isValid) {
        request.log.warn('Invalid Persona webhook signature');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      const event = request.body as any;

      // Handle inquiry completed and approved
      if (event.data?.type === 'inquiry' && event.data?.attributes?.status === 'approved') {
        const inquiryId = event.data.id;
        const buyerId = event.data.attributes['reference-id']; // This should be buyer.id

        request.log.info(`Processing Persona webhook for buyer ${buyerId}, inquiry ${inquiryId}`);

        // Get verified data from Persona
        const personaData = await getVerifiedPersonaData(inquiryId);
        
        if (!personaData) {
          request.log.error(`No verified data available for inquiry ${inquiryId}`);
          return reply.status(400).send({ error: 'No verified data available' });
        }

        // Get buyer record
        const buyer = await getBuyerById(buyerId);
        if (!buyer) {
          request.log.error(`Buyer not found for ID ${buyerId}`);
          return reply.status(404).send({ error: 'Buyer not found' });
        }

        // Issue Privado ID credential
        const privadoCredential = await issuePrivadoCredential(buyerId, personaData);

        // Encrypt and store buyer secrets
        const encryptionKeyId = generateEncryptionKeyId();
        const encryptedPersonaData = encryptPersonaData(personaData);
        const encryptedCredential = encryptPrivadoCredential(privadoCredential);

        await createBuyerSecrets({
          buyer_id: buyerId,
          encrypted_persona_data: encryptedPersonaData,
          encrypted_privado_credential: encryptedCredential,
          encryption_key_id: encryptionKeyId,
          persona_verification_session: inquiryId,
        });

        // Update buyer status
        const updatedBuyer = await updateBuyerAccount(buyerId, {
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verification_expires_at: personaData.dl_expiration,
          privado_did: privadoCredential.credentialSubject.id,
          privado_credential_id: privadoCredential.id,
        });

        // Get buyer email from auth_accounts
        // Note: We'd need to join with auth_accounts to get email
        // For now, using a placeholder - this should be improved
        const buyerEmail = 'placeholder@example.com'; // TODO: Get actual email

        // Send completion email
        await sendBuyerVerificationComplete(buyerEmail, personaData.dl_expiration);

        request.log.info(`Buyer ${buyerId} verification completed successfully`);
      }

      // Handle inquiry declined/failed
      if (event.data?.type === 'inquiry' && 
          ['declined', 'failed'].includes(event.data?.attributes?.status)) {
        const inquiryId = event.data.id;
        const buyerId = event.data.attributes['reference-id'];
        const status = event.data.attributes.status;

        // Update buyer status to rejected
        await updateBuyerAccount(buyerId, {
          verification_status: 'rejected',
        });

        request.log.info(`Buyer ${buyerId} verification ${status} for inquiry ${inquiryId}`);
      }

      return reply.send({ 
        success: true,
        received: true,
        processed_at: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error({ error }, 'Persona webhook processing failed');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Stripe webhook - payment and subscription events
  fastify.post('/stripe', async (request, reply) => {
    try {
      const signature = request.headers['stripe-signature'] as string;
      const payload = (request as any).rawBody as string;

      // Verify webhook signature
      const event = verifyWebhookSignature(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      request.log.info(`Processing Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        
        // Buyer payment events
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object, request);
          break;

        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object, request);
          break;

        // Dealer subscription events  
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object, request);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object, request);
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object, request);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object, request);
          break;

        default:
          request.log.info(`Unhandled Stripe event type: ${event.type}`);
      }

      return reply.send({ 
        success: true,
        received: true,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error({ error }, 'Stripe webhook processing failed');
      return reply.status(400).send({ error: 'Webhook error' });
    }
  });
}

// Helper functions for Stripe event processing

async function handleCheckoutCompleted(session: any, request: any) {
  const metadata = session.metadata;
  
  if (metadata?.buyer_id) {
    // Buyer verification payment completed
    await updateBuyerAccount(metadata.buyer_id, {
      payment_status: 'paid',
      stripe_payment_id: session.payment_intent,
    });
    
    request.log.info(`Buyer payment completed for buyer ${metadata.buyer_id}`);
  }
  
  if (metadata?.dealer_id) {
    // Dealer subscription setup completed
    const subscription = await getSubscriptionDetails(session.subscription);
    
    await updateDealerAccount(metadata.dealer_id, {
      stripe_subscription_id: session.subscription,
      subscription_status: subscription.status as any,
      monthly_query_limit: parseInt(metadata.monthly_query_limit || '100'),
    });
    
    request.log.info(`Dealer subscription completed for dealer ${metadata.dealer_id}`);
  }
}

async function handlePaymentSucceeded(paymentIntent: any, request: any) {
  request.log.info(`Payment succeeded: ${paymentIntent.id}`);
  // Additional payment processing logic if needed
}

async function handleSubscriptionUpdate(subscription: any, request: any) {
  const customerId = subscription.customer;
  
  // Find dealer by Stripe customer ID
  // Note: We'd need to implement getDealerByStripeCustomerId
  // For now, logging the event
  
  request.log.info(`Subscription updated: ${subscription.id} for customer ${customerId}`);
}

async function handleSubscriptionDeleted(subscription: any, request: any) {
  const customerId = subscription.customer;
  
  // Update dealer subscription status to cancelled
  // Note: We'd need to implement getDealerByStripeCustomerId
  
  request.log.info(`Subscription deleted: ${subscription.id} for customer ${customerId}`);
}

async function handleInvoicePaymentSucceeded(invoice: any, request: any) {
  const subscriptionId = invoice.subscription;
  
  // Reset monthly query count on successful payment
  // Note: We'd need to implement getDealerByStripeSubscriptionId
  
  request.log.info(`Invoice payment succeeded for subscription: ${subscriptionId}`);
  
  // Reset dealer query count for new billing period
  // await resetDealerQueryCount(dealerId);
}

async function handleInvoicePaymentFailed(invoice: any, request: any) {
  const subscriptionId = invoice.subscription;
  
  // Handle failed payment - maybe suspend dealer account
  request.log.warn(`Invoice payment failed for subscription: ${subscriptionId}`);
  
  // Could update dealer status to 'past_due'
  // await updateDealerAccount(dealerId, { subscription_status: 'past_due' });
}