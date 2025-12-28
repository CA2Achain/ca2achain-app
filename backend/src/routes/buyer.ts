import { FastifyInstance } from 'fastify';
import { 
  getBuyerByEmail, 
  getBuyerSecrets, 
  deleteBuyerSecrets,
  getBuyerAuditLogs,
  createBuyerAccount,
  updateBuyerAccount,
  createBuyerSecrets
} from '../services/supabase.js';
import { createBuyerCheckoutSession, verifyBuyerPayment } from '../services/stripe.js';
import { createBuyerInquiry, getVerifiedPersonaData } from '../services/persona.js';
import { issuePrivadoCredential } from '../services/polygonid.js';
import { encryptPersonaData, encryptPrivadoCredential, generateEncryptionKeyId } from '../services/encryption.js';
import { sendBuyerVerificationStarted, sendBuyerVerificationComplete, sendDataDeletionConfirmation } from '../services/email.js';
import { deleteUser } from '../services/auth.js';

export default async function buyerRoutes(fastify: FastifyInstance) {
  
  // Create buyer account (after auth but before payment)
  fastify.post('/register', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      
      if (authAccount.account_type !== 'buyer') {
        return reply.status(403).send({ 
          success: false,
          error: 'Only buyer accounts can access this endpoint' 
        });
      }

      // Check if buyer account already exists
      let buyer = await getBuyerByEmail(authAccount.email);
      
      if (buyer) {
        return reply.status(409).send({
          success: false,
          error: 'Buyer account already exists',
          buyer_id: buyer.id,
        });
      }

      // Create buyer account
      buyer = await createBuyerAccount({
        auth_id: authAccount.id,
        payment_status: 'pending',
      });

      return reply.send({
        success: true,
        buyer_id: buyer.id,
        payment_status: buyer.payment_status,
        message: 'Buyer account created. Please complete payment to start verification.',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to create buyer account' 
      });
    }
  });

  // Create payment session for $2 verification fee
  fastify.post('/payment', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      if (buyer.payment_status === 'paid') {
        return reply.status(409).send({
          success: false,
          error: 'Payment already completed',
        });
      }

      // Create Stripe checkout session
      const session = await createBuyerCheckoutSession(
        authAccount.email,
        buyer.id
      );

      return reply.send({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to create payment session' 
      });
    }
  });

  // Verify payment and start identity verification
  fastify.post('/payment/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { session_id } = request.body as { session_id: string };
      const authAccount = request.user!;

      // Verify payment with Stripe
      const payment = await verifyBuyerPayment(session_id);
      
      // Update buyer payment status
      const buyer = await updateBuyerAccount(payment.buyerId, {
        payment_status: 'paid',
        stripe_payment_id: payment.paymentIntentId,
      });

      // Send verification started email
      await sendBuyerVerificationStarted(authAccount.email);

      return reply.send({
        success: true,
        message: 'Payment verified. You can now start identity verification.',
        buyer_id: buyer.id,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to verify payment' 
      });
    }
  });

  // Start identity verification with Persona
  fastify.post('/verification/start', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      if (buyer.payment_status !== 'paid') {
        return reply.status(402).send({
          success: false,
          error: 'Payment required before verification',
        });
      }

      // Check if already verified and not expired
      const isExpired = buyer.verification_expires_at 
        ? new Date(buyer.verification_expires_at) < new Date()
        : false;

      if (buyer.verification_status === 'verified' && !isExpired) {
        return reply.status(409).send({ 
          success: false,
          error: 'Already verified',
          verified_at: buyer.verified_at,
          expires_at: buyer.verification_expires_at,
        });
      }

      // If expired, delete old secrets before re-verification
      if (isExpired) {
        await deleteBuyerSecrets(buyer.id);
      }

      // Create Persona inquiry
      const inquiry = await createBuyerInquiry(buyer.id);

      // Update buyer status to pending
      await updateBuyerAccount(buyer.id, {
        verification_status: 'pending',
      });

      return reply.send({
        success: true,
        inquiry_id: inquiry.id,
        session_token: inquiry.attributes['session-token'],
        is_reverification: isExpired,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to start verification' 
      });
    }
  });

  // Complete verification (called by Persona webhook or manual check)
  fastify.post('/verification/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { inquiry_id } = request.body as { inquiry_id: string };
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      // Get verified data from Persona
      const personaData = await getVerifiedPersonaData(inquiry_id);
      
      if (!personaData) {
        return reply.status(400).send({
          success: false,
          error: 'Verification not approved yet',
        });
      }

      // Issue Privado ID credential
      const privadoCredential = await issuePrivadoCredential(buyer.id, personaData);

      // Encrypt and store buyer secrets
      const encryptionKeyId = generateEncryptionKeyId();
      const encryptedPersonaData = encryptPersonaData(personaData);
      const encryptedCredential = encryptPrivadoCredential(privadoCredential);

      await createBuyerSecrets({
        buyer_id: buyer.id,
        encrypted_persona_data: encryptedPersonaData,
        encrypted_privado_credential: encryptedCredential,
        encryption_key_id: encryptionKeyId,
        persona_verification_session: inquiry_id,
      });

      // Update buyer status
      const updatedBuyer = await updateBuyerAccount(buyer.id, {
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verification_expires_at: personaData.dl_expiration,
        privado_did: privadoCredential.credentialSubject.id,
        privado_credential_id: privadoCredential.id,
      });

      // Send completion email
      await sendBuyerVerificationComplete(authAccount.email, personaData.dl_expiration);

      return reply.send({
        success: true,
        message: 'Verification completed successfully',
        verified_at: updatedBuyer.verified_at,
        expires_at: updatedBuyer.verification_expires_at,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to complete verification' 
      });
    }
  });

  // Get buyer status
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      const secrets = await getBuyerSecrets(buyer.id);
      const isExpired = buyer.verification_expires_at 
        ? new Date(buyer.verification_expires_at) < new Date()
        : false;

      return reply.send({
        success: true,
        buyer_id: buyer.id,
        verification_status: buyer.verification_status,
        verified: buyer.verification_status === 'verified' && !isExpired,
        verified_at: buyer.verified_at,
        expires_at: buyer.verification_expires_at,
        is_expired: isExpired,
        needs_reverification: isExpired,
        has_data: !!secrets,
        payment_status: buyer.payment_status,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get buyer status' 
      });
    }
  });

  // Get buyer audit logs (who verified their data)
  fastify.get('/audit-logs', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      const logs = await getBuyerAuditLogs(buyer.id);

      return reply.send({ 
        success: true,
        audit_logs: logs 
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch audit logs' 
      });
    }
  });

  // Delete buyer data (CCPA compliance)
  fastify.delete('/data', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      // Delete encrypted secrets (PII)
      await deleteBuyerSecrets(buyer.id);

      // Delete user from Supabase Auth (cascades to auth_accounts and buyer_accounts)
      await deleteUser(authAccount.id);

      // Send confirmation email
      await sendDataDeletionConfirmation(authAccount.email, 'buyer');

      return reply.send({ 
        success: true,
        message: 'Your data has been permanently deleted',
        deleted_at: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to delete data' 
      });
    }
  });
}