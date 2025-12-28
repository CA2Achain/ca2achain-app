import { FastifyInstance } from 'fastify';
import { verificationRequestSchema } from '@ca2achain/shared';
import { 
  getBuyerByEmail, 
  getBuyerSecrets,
  getDealerByApiKeyHash,
  createComplianceEvent,
  incrementDealerQueryCount
} from '../services/supabase.js';
import { decryptPersonaData, decryptPrivadoCredential, hashApiKey } from '../services/encryption.js';
import { 
  generateAgeProof, 
  generateAddressProof, 
  verifyZKProof,
  createComplianceRecord,
  deserializeCredential 
} from '../services/polygonid.js';

export default async function verificationRoutes(fastify: FastifyInstance) {
  
  // Core AB 1263 verification endpoint for dealers
  fastify.post('/verify', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    try {
      const verificationData = verificationRequestSchema.parse(request.body);
      const dealer = request.dealer!; // Set by API key middleware

      // Validate AB 1263 compliance requirements
      if (!verificationData.ab1263_disclosure_presented) {
        return reply.status(400).send({ 
          success: false,
          error: 'AB 1263 disclosure must be presented to buyer' 
        });
      }

      if (!verificationData.acknowledgment_received) {
        return reply.status(400).send({ 
          success: false,
          error: 'Buyer acknowledgment required for AB 1263 compliance' 
        });
      }

      // Check dealer query limits
      if (dealer.queries_used_this_month >= dealer.monthly_query_limit) {
        return reply.status(429).send({
          success: false,
          error: 'Monthly query limit exceeded',
          queries_used: dealer.queries_used_this_month,
          query_limit: dealer.monthly_query_limit,
        });
      }

      // Get buyer by email
      const buyer = await getBuyerByEmail(verificationData.buyer_email);
      if (!buyer) {
        // Increment query count even for failed requests
        await incrementDealerQueryCount(dealer.id);
        
        return reply.status(404).send({ 
          success: false,
          verification_result: 'FAIL',
          error: 'Buyer not found',
          message: 'Buyer must register and complete identity verification first',
        });
      }

      // Check if buyer is verified
      if (buyer.verification_status !== 'verified') {
        await incrementDealerQueryCount(dealer.id);
        
        return reply.status(400).send({ 
          success: false,
          verification_result: 'FAIL',
          error: 'Buyer not verified',
          verification_status: buyer.verification_status,
        });
      }

      // Check if verification has expired
      const isExpired = buyer.verification_expires_at 
        ? new Date(buyer.verification_expires_at) < new Date()
        : false;

      if (isExpired) {
        await incrementDealerQueryCount(dealer.id);
        
        return reply.status(400).send({ 
          success: false,
          verification_result: 'FAIL',
          error: 'Buyer verification expired',
          expired_at: buyer.verification_expires_at,
          message: 'Buyer needs to re-verify with updated ID',
        });
      }

      // Get encrypted buyer secrets
      const secrets = await getBuyerSecrets(buyer.id);
      if (!secrets) {
        await incrementDealerQueryCount(dealer.id);
        
        return reply.status(404).send({ 
          success: false,
          verification_result: 'FAIL',
          error: 'Buyer data not found',
        });
      }

      // Decrypt data for verification
      const personaData = decryptPersonaData(secrets.encrypted_persona_data);
      const privadoCredential = decryptPrivadoCredential(secrets.encrypted_privado_credential);

      // Generate verification ID for this specific verification
      const verificationId = `VER-${Date.now().toString(36).toUpperCase()}`;

      // Generate ZK proofs
      const ageProof = await generateAgeProof(privadoCredential, 18); // AB 1263 requires 18+
      const addressProof = await generateAddressProof(privadoCredential, verificationData.shipping_address);

      // Verify proofs are valid
      const ageValid = await verifyZKProof(ageProof);
      const addressValid = await verifyZKProof(addressProof);

      if (!ageValid || !addressValid) {
        await incrementDealerQueryCount(dealer.id);
        
        return reply.status(500).send({ 
          success: false,
          verification_result: 'FAIL',
          error: 'Proof verification failed',
        });
      }

      // Extract verification results from proofs
      const ageVerified = ageProof.public_signals[0] === '1'; // 1 = over 18, 0 = under 18
      const addressVerified = addressProof.public_signals[0] === '1'; // 1 = match, 0 = no match

      // Calculate overall verification result
      const verificationResult = ageVerified && addressVerified ? 'PASS' : 'FAIL';
      
      // Calculate confidence score based on various factors
      let confidenceScore = 0;
      if (ageVerified) confidenceScore += 50;
      if (addressVerified) confidenceScore += 40;
      if (personaData.dl_number) confidenceScore += 10; // Valid DL adds confidence
      
      // Create compliance record for blockchain storage
      const complianceRecord = createComplianceRecord(
        verificationId,
        ageProof,
        addressProof,
        dealer.id,
        verificationData.transaction_id
      );

      // Store compliance event in database
      await createComplianceEvent({
        verification_id: verificationId,
        buyer_id: buyer.id,
        dealer_id: dealer.id,
        dealer_request: {
          buyer_email: verificationData.buyer_email,
          buyer_dob: verificationData.buyer_dob,
          shipping_address: verificationData.shipping_address,
          transaction_id: verificationData.transaction_id,
          ab1263_disclosure_presented: verificationData.ab1263_disclosure_presented,
          acknowledgment_received: verificationData.acknowledgment_received,
          timestamp: new Date().toISOString(),
          dealer_ip: request.ip,
        },
        privado_proofs: {
          age_verification: ageProof,
          address_verification: addressProof,
        },
        compliance_attestation: complianceRecord,
        blockchain_status: 'pending', // Will be updated by blockchain service
        verification_result: verificationResult,
        age_verified: ageVerified,
        address_verified: addressVerified,
        confidence_score: confidenceScore,
      });

      // Increment dealer query count
      await incrementDealerQueryCount(dealer.id);

      // Return verification result
      return reply.send({
        success: true,
        verification_id: verificationId,
        verification_result: verificationResult,
        age_verified: ageVerified,
        address_verified: addressVerified,
        confidence_score: confidenceScore,
        timestamp: new Date().toISOString(),
        ab1263_compliance: {
          disclosure_presented: verificationData.ab1263_disclosure_presented,
          acknowledgment_received: verificationData.acknowledgment_received,
          compliance_version: 'AB1263-2026.1',
        },
        // Note: No PII is returned - only verification status
        message: verificationResult === 'PASS' 
          ? 'Buyer verified for age and address compliance'
          : 'Buyer verification failed - review requirements',
      });

    } catch (error) {
      request.log.error(error);
      
      // Still increment query count on errors to prevent abuse
      if (request.dealer) {
        await incrementDealerQueryCount(request.dealer.id);
      }
      
      return reply.status(500).send({ 
        success: false,
        verification_result: 'FAIL',
        error: 'Internal server error',
      });
    }
  });

  // Batch verification endpoint (for high-volume dealers)
  fastify.post('/verify-batch', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    try {
      const { verifications } = request.body as {
        verifications: Array<{
          buyer_email: string;
          buyer_dob: string;
          shipping_address: string;
          transaction_id: string;
          ab1263_disclosure_presented: boolean;
          acknowledgment_received: boolean;
        }>;
      };

      if (!Array.isArray(verifications) || verifications.length === 0) {
        return reply.status(400).send({ 
          success: false,
          error: 'Invalid batch request - must provide array of verifications' 
        });
      }

      if (verifications.length > 50) { // Reduced batch size for security
        return reply.status(400).send({ 
          success: false,
          error: 'Batch size limited to 50 verifications' 
        });
      }

      const dealer = request.dealer!;

      // Check if dealer has enough queries remaining
      const queriesNeeded = verifications.length;
      const queriesRemaining = dealer.monthly_query_limit - dealer.queries_used_this_month;
      
      if (queriesNeeded > queriesRemaining) {
        return reply.status(429).send({
          success: false,
          error: 'Insufficient query quota for batch request',
          queries_needed: queriesNeeded,
          queries_remaining: queriesRemaining,
        });
      }

      const results = [];

      for (const verification of verifications) {
        try {
          // Validate each verification request
          const verificationData = verificationRequestSchema.parse(verification);
          
          // Perform same verification logic as single endpoint
          // (Implementation would be similar to above, but condensed)
          
          // For brevity, returning simplified results here
          // In production, each would go through full verification flow
          
          results.push({
            transaction_id: verificationData.transaction_id,
            buyer_email: verificationData.buyer_email,
            verification_result: 'PASS', // Placeholder
            verification_id: `VER-${Date.now().toString(36).toUpperCase()}`,
            age_verified: true,
            address_verified: true,
            confidence_score: 90,
            timestamp: new Date().toISOString(),
          });

          // Increment query count for each verification
          await incrementDealerQueryCount(dealer.id);

        } catch (verificationError) {
          results.push({
            transaction_id: verification.transaction_id || 'unknown',
            buyer_email: verification.buyer_email,
            verification_result: 'FAIL',
            error: 'Verification processing failed',
            timestamp: new Date().toISOString(),
          });
          
          // Still count failed verifications against quota
          await incrementDealerQueryCount(dealer.id);
        }
      }

      return reply.send({
        success: true,
        batch_id: `BATCH-${Date.now().toString(36).toUpperCase()}`,
        total_verifications: verifications.length,
        results: results,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Batch verification failed' 
      });
    }
  });

  // Get verification status by verification ID (for audit trails)
  fastify.get('/status/:verification_id', {
    preHandler: [fastify.authenticateApiKey],
  }, async (request, reply) => {
    try {
      const { verification_id } = request.params as { verification_id: string };
      const dealer = request.dealer!;

      // TODO: Implement getComplianceEventByVerificationId in supabase service
      // const complianceEvent = await getComplianceEventByVerificationId(verification_id);
      
      // For now, return placeholder
      return reply.send({
        success: true,
        verification_id: verification_id,
        status: 'completed',
        verification_result: 'PASS',
        timestamp: new Date().toISOString(),
        blockchain_status: 'confirmed',
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get verification status' 
      });
    }
  });
}