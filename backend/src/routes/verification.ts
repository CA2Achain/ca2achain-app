import { FastifyInstance } from 'fastify';
import { verificationRequestSchema } from '@ca2achain/shared';
import { getUserByEmail, getPIIByUserId, createAuditLog, incrementCustomerQueryCount } from '../services/supabase.js';
import { decrypt } from '../services/encryption.js';
import { deserializeCredential, generateProof, verifyProof } from '../services/polygonid.js';

export default async function verificationRoutes(fastify: FastifyInstance) {
  // Third-party verification endpoint (requires API key)
  fastify.post('/verify', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    try {
      const { user_email, claim_type } = verificationRequestSchema.parse(request.body);
      const customer = request.customer!;

      // Get user by email
      const user = await getUserByEmail(user_email);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check if user is verified
      if (!user.verified_at) {
        return reply.status(400).send({ error: 'User not verified' });
      }

      // Check if verification has expired
      if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date()) {
        return reply.status(400).send({ 
          error: 'User verification has expired',
          expired_at: user.verification_expires_at,
          message: 'User needs to re-verify with updated ID'
        });
      }

      // Get encrypted PII and credential
      const pii = await getPIIByUserId(user.id);
      if (!pii) {
        return reply.status(404).send({ error: 'User data not found' });
      }

      // Decrypt and deserialize Polygon credential
      const credentialJson = decrypt(pii.encrypted_polygon_credential);
      const credential = deserializeCredential(credentialJson);

      // Generate zero-knowledge proof for the claim
      const proof = await generateProof(credential, claim_type);

      // Verify the proof (sanity check)
      const isValid = await verifyProof(proof);
      if (!isValid) {
        return reply.status(500).send({ error: 'Proof generation failed' });
      }

      // Log the verification request
      await createAuditLog({
        user_id: user.id,
        customer_id: customer.id,
        claim_verified: claim_type,
        ip_address: request.ip,
        result: proof.result ? 'approved' : 'denied',
      });

      // Increment customer query count
      await incrementCustomerQueryCount(customer.id);

      // Return result
      return reply.send({
        result: proof.result,
        claim: claim_type,
        timestamp: proof.timestamp,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Batch verification endpoint
  fastify.post('/verify-batch', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    try {
      const { verifications } = request.body as {
        verifications: Array<{ user_email: string; claim_type: string }>;
      };

      if (!Array.isArray(verifications) || verifications.length === 0) {
        return reply.status(400).send({ error: 'Invalid batch request' });
      }

      if (verifications.length > 100) {
        return reply.status(400).send({ error: 'Batch size limited to 100' });
      }

      const results = [];

      for (const verification of verifications) {
        try {
          const { user_email, claim_type } = verificationRequestSchema.parse(verification);
          
          const user = await getUserByEmail(user_email);
          if (!user || !user.verified_at) {
            results.push({
              user_email,
              claim_type,
              result: false,
              error: 'User not found or not verified',
            });
            continue;
          }

          const pii = await getPIIByUserId(user.id);
          if (!pii) {
            results.push({
              user_email,
              claim_type,
              result: false,
              error: 'User data not found',
            });
            continue;
          }

          const credentialJson = decrypt(pii.encrypted_polygon_credential);
          const credential = deserializeCredential(credentialJson);
          const proof = await generateProof(credential, claim_type);

          results.push({
            user_email,
            claim_type,
            result: proof.result,
            timestamp: proof.timestamp,
          });

          // Log each verification
          await createAuditLog({
            user_id: user.id,
            customer_id: request.customer!.id,
            claim_verified: claim_type,
            ip_address: request.ip,
            result: proof.result ? 'approved' : 'denied',
          });
        } catch (err) {
          results.push({
            user_email: verification.user_email,
            claim_type: verification.claim_type,
            result: false,
            error: 'Verification failed',
          });
        }
      }

      // Increment query count by batch size
      for (let i = 0; i < verifications.length; i++) {
        await incrementCustomerQueryCount(request.customer!.id);
      }

      return reply.send({ results });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}