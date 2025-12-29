import { FastifyInstance } from 'fastify';
import { 
  getBuyerByEmail, 
  getBuyerSecrets, 
  deleteBuyerSecrets,
  deleteBuyerAccount,
  getBuyerAuditLogs,
  getComplianceEventById,
  createBuyerAccount,
  updateBuyerAccount,
  createBuyerSecrets
} from '../services/supabase.js';
import { createBuyerCheckoutSession, verifyBuyerPayment } from '../services/service-resolver.js';
import { 
  createBuyerInquiry, 
  getVerifiedPersonaData 
} from '../services/mocks/persona.js';
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
      if (!payment.buyerId) {
        throw new Error('Payment verification failed: missing buyer ID');
      }
      
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

  // Delete buyer data only (CCPA compliance - keeps verification history access)
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

      // Delete only PII data, keep account for verification history access
      await deleteBuyerSecrets(buyer.id);

      // Send confirmation email before account modification
      await sendDataDeletionConfirmation(authAccount.email, 'partial');

      return reply.send({
        success: true,
        message: 'Your personal data has been permanently deleted',
        deleted_at: new Date().toISOString(),
        note: 'Your account remains active to access verification history. Use DELETE /account to delete everything.'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to delete data' 
      });
    }
  });

  // Delete complete buyer account (CCPA compliance - nuclear option)
  fastify.delete('/account', {
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

      // Send confirmation email before account deletion
      await sendDataDeletionConfirmation(authAccount.email, 'complete');

      // Complete account deletion (buyer_account, buyer_secrets, anonymize compliance_events)
      await deleteBuyerAccount(buyer.id);

      // Delete from Supabase Auth
      await deleteUser(authAccount.id);

      return reply.send({
        success: true,
        message: 'Your account has been permanently deleted',
        deleted_at: new Date().toISOString(),
        compliance_note: 'Blockchain verification proofs remain for legal compliance but contain no personal information',
        ccpa_compliance: true
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to delete buyer account');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to delete account' 
      });
    }
  });

  // Get buyer's compliance/verification history
  fastify.get('/compliance-history', {
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

      // Get buyer's audit logs and compliance events
      const auditLogs = await getBuyerAuditLogs(buyer.id);

      // Format compliance history for buyer view
      const complianceHistory = auditLogs.map((event: any) => ({
        verification_id: event.verification_id,
        verification_date: event.created_at,
        dealer_company: event.dealer_company_name,
        verification_result: {
          age_verified: event.verification_response?.age_verified || false,
          address_verified: event.verification_response?.address_verified || false,
          confidence_score: event.verification_response?.confidence_score || 0
        },
        compliance_status: event.verification_response?.age_verified && event.verification_response?.address_verified ? 'COMPLIANT' : 'NON_COMPLIANT',
        blockchain_status: event.blockchain_status || 'pending',
        blockchain_tx_hash: event.blockchain_tx_hash || null,
        ab1263_compliance: {
          disclosure_presented: event.dealer_request?.ab1263_disclosure_presented || false,
          acknowledgment_received: event.dealer_request?.acknowledgment_received || false
        },
        transaction_id: event.dealer_request?.transaction_id,
        shipping_address_used: event.dealer_request?.shipping_address
      }));

      return reply.send({
        success: true,
        buyer_id: buyer.id,
        verification_count: complianceHistory.length,
        compliance_history: complianceHistory,
        privacy_notice: 'This data can be deleted per your CCPA rights. Blockchain proofs will remain for legal compliance but contain no personal information.'
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to get buyer compliance history');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to retrieve compliance history' 
      });
    }
  });

  // Get specific compliance event details for buyer
  fastify.get('/compliance-event/:verification_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { verification_id } = request.params as { verification_id: string };
      const authAccount = request.user!;
      const buyer = await getBuyerByEmail(authAccount.email);
      
      if (!buyer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Buyer account not found' 
        });
      }

      // Get specific compliance event (need to add this function)
      const auditLogs = await getBuyerAuditLogs(buyer.id);
      const specificEvent = auditLogs.find((event: any) => event.verification_id === verification_id);

      if (!specificEvent) {
        return reply.status(404).send({
          success: false,
          error: 'Compliance event not found for this buyer'
        });
      }

      return reply.send({
        success: true,
        compliance_event: {
          verification_id: specificEvent.verification_id,
          verification_date: specificEvent.created_at,
          dealer_information: {
            company_name: specificEvent.dealer_company_name,
            masked_api_key: '••••••••' + (specificEvent.dealer_api_key?.slice(-4) || ''),
            compliance_acknowledged: specificEvent.dealer_request?.ab1263_disclosure_presented
          },
          verification_results: specificEvent.verification_response,
          legal_compliance: {
            ab1263_requirements_met: specificEvent.verification_response?.age_verified && specificEvent.verification_response?.address_verified,
            ccpa_rights_preserved: true,
            blockchain_proof_stored: !!specificEvent.blockchain_tx_hash
          },
          blockchain_information: {
            status: specificEvent.blockchain_status,
            transaction_hash: specificEvent.blockchain_tx_hash,
            immutable_proof: !!specificEvent.blockchain_tx_hash,
            contains_personal_data: false
          },
          privacy_notes: 'This verification used zero-knowledge proofs. Your personal information was never shared with the dealer.'
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to get compliance event details');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to retrieve compliance event details' 
      });
    }
  });

  // Get buyer profile information
  fastify.get('/profile', {
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

      return reply.send({
        success: true,
        buyer: {
          id: buyer.id,
          first_name: buyer.first_name,
          last_name: buyer.last_name,
          email: buyer.email,
          phone: buyer.phone,
          verification_status: buyer.verification_status,
          payment_status: buyer.payment_status,
          created_at: buyer.created_at,
          updated_at: buyer.updated_at
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to get buyer profile');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get profile' 
      });
    }
  });

  // Update buyer profile information
  fastify.put('/profile', {
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

      const updates = request.body as {
        first_name?: string;
        last_name?: string;
        phone?: string;
      };

      // Only allow updating safe fields
      const allowedUpdates = {
        ...(updates.first_name && { first_name: updates.first_name }),
        ...(updates.last_name && { last_name: updates.last_name }),
        ...(updates.phone && { phone: updates.phone }),
        updated_at: new Date().toISOString()
      };

      if (Object.keys(allowedUpdates).length === 1) { // Only updated_at
        return reply.status(400).send({
          success: false,
          error: 'No valid fields provided for update'
        });
      }

      const updatedBuyer = await updateBuyerAccount(buyer.id, allowedUpdates);

      return reply.send({
        success: true,
        message: 'Profile updated successfully',
        buyer: {
          id: updatedBuyer.id,
          first_name: updatedBuyer.first_name,
          last_name: updatedBuyer.last_name,
          email: updatedBuyer.email,
          phone: updatedBuyer.phone,
          verification_status: updatedBuyer.verification_status,
          updated_at: updatedBuyer.updated_at
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to update buyer profile');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to update profile' 
      });
    }
  });
}