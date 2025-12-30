import { FastifyInstance } from 'fastify';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, sendInsufficientCredits, apiKeyRequired } from '../utils/api-responses.js';
import { getBuyerByAuth } from '../services/database/buyer-accounts.js';
import { getBuyerSecrets } from '../services/database/buyer-secrets.js';
import { createComplianceEvent, getComplianceEventById, getDealerVerificationHistory } from '../services/database/compliance-events.js';
import { decryptPersonaData, decryptPrivadoCredential, extractHashReproducibilityData, generateCommitmentHash, normalizeAddress } from '../services/encryption.js';
import { 
  verificationRequestSchema, 
  verificationResponseSchema,
  complianceHistoryRequestSchema,
  type VerificationRequest,
  type VerificationResponse 
} from '@ca2achain/shared';

export default async function verificationRoutes(fastify: FastifyInstance) {
  // Main dealer API - Verify buyer age and address
  fastify.post('/verify', createRouteSchema({
    tags: ['verification'],
    summary: 'Verify buyer age and address',
    description: 'Verify buyer age (18+) and address using zero-knowledge proofs. Costs 1 credit per request.',
    security: apiKeyRequired,
    body: {
      type: 'object',
      properties: {
        buyer_email: { 
          type: 'string', 
          format: 'email',
          description: 'Email address of the buyer to verify'
        },
        shipping_address: { 
          type: 'string',
          description: 'Shipping address as a string for verification'
        },
        ab1263_compliance_completed: { 
          type: 'boolean',
          enum: [true],
          description: 'Must be true to confirm AB 1263 compliance completed'
        }
      },
      required: ['buyer_email', 'shipping_address', 'ab1263_compliance_completed']
    },
    response: {
      description: 'Verification completed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [true] },
              data: {
                type: 'object',
                properties: {
                  buyer_email: { type: 'string', format: 'email' },
                  age_verified: { type: 'boolean' },
                  address_verified: { type: 'boolean' },
                  address_match_confidence: { type: 'number', minimum: 0, maximum: 1 },
                  normalized_address_used: { type: 'string' },
                  verified_at: { type: 'string', format: 'date-time' },
                  compliance_event_id: { type: 'string', format: 'uuid' },
                  zkp_proofs: {
                    type: 'object',
                    properties: {
                      age_proof_hash: { type: 'string' },
                      address_proof_hash: { type: 'string' }
                    }
                  },
                  message: { type: 'string' }
                },
                required: ['buyer_email', 'age_verified', 'address_verified', 'address_match_confidence', 'verified_at', 'compliance_event_id']
              }
            }
          }
        }
      }
    }
  }), { preHandler: fastify.authenticateApiKey }, async (request, reply) => {
    try {
      const verificationRequest = verificationRequestSchema.parse(request.body) as VerificationRequest;
      const dealer = request.dealer!; // Set by API key middleware

      // Find buyer by email (through auth.users)
      const supabase = require('../services/database/connection.js').getClient();
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(verificationRequest.buyer_email);
      
      if (authError || !authUser.user) {
        return sendError(reply, 'Buyer not found', 404, 'No buyer account found with this email');
      }

      // Get buyer account
      const buyer = await getBuyerByAuth(authUser.user.id);
      if (!buyer) {
        return sendError(reply, 'Buyer account not found', 404);
      }

      // Check if buyer is verified
      if (buyer.verification_status !== 'verified') {
        return sendError(reply, 'Buyer not verified', 400, 'Buyer has not completed identity verification');
      }

      // Get encrypted buyer secrets for ZKP extraction
      const buyerSecrets = await getBuyerSecrets(buyer.id);
      if (!buyerSecrets) {
        return sendError(reply, 'Buyer secrets not found', 404, 'Buyer verification data not available');
      }

      // Decrypt buyer secrets temporarily for verification
      const decryptedPersonaData = decryptPersonaData(buyerSecrets.encrypted_persona_data);
      const decryptedPrivadoCredential = decryptPrivadoCredential(buyerSecrets.encrypted_privado_credential);

      // Extract hash reproducibility data
      const complianceEventId = require('crypto').randomUUID();
      const hashData = extractHashReproducibilityData(
        buyer.id,
        buyer.buyer_reference_id,
        decryptedPersonaData,
        decryptedPrivadoCredential,
        complianceEventId
      );

      // Normalize shipping address for comparison
      // Parse address string into structured format (simplified)
      const normalizedShippingAddress = verificationRequest.shipping_address.toUpperCase().trim();
      const normalizedBuyerAddress = hashData.normalized_buyer_address;

      // Calculate address match confidence (simplified string similarity)
      const addressMatch = normalizedBuyerAddress.includes(normalizedShippingAddress) || 
                          normalizedShippingAddress.includes(normalizedBuyerAddress);
      const addressMatchConfidence = addressMatch ? 0.95 : 0.1;

      // Verification results
      const ageVerified = hashData.age_verified;
      const addressVerified = addressMatchConfidence > 0.8;

      // Create verification data following verificationDataSchema structure
      const verificationData = {
        compliance_event: {
          version: "AB1263-2026.1",
          compliance_event_id: complianceEventId,
          timestamp: new Date().toISOString(),
          buyer_reference: buyer.buyer_reference_id,
          dealer_reference: dealer.dealer_reference_id
        },
        zkp_verifications: {
          age_check: {
            zkp_age_proof: hashData.zkp_age_proof,
            buyer_secret: hashData.buyer_secret,
            date_of_birth: hashData.date_of_birth,
            age_verified: ageVerified,
            verified_at_timestamp: new Date().toISOString(),
            commitment_hash: generateCommitmentHash({
              zkp_age_proof: hashData.zkp_age_proof,
              buyer_reference: buyer.buyer_reference_id,
              buyer_secret: hashData.buyer_secret,
              date_of_birth: hashData.date_of_birth,
              age_verified: ageVerified,
              verified_at_timestamp: new Date().toISOString()
            })
          },
          address_verification: {
            zkp_address_proof: hashData.zkp_address_proof,
            normalized_buyer_address: normalizedBuyerAddress,
            normalized_shipping_address: normalizedShippingAddress,
            match_confidence: addressMatchConfidence,
            address_match_verified: addressVerified,
            verified_at_timestamp: new Date().toISOString(),
            commitment_hash: generateCommitmentHash({
              zkp_address_proof: hashData.zkp_address_proof,
              normalized_buyer_address: normalizedBuyerAddress,
              normalized_shipping_address: normalizedShippingAddress,
              match_confidence: addressMatchConfidence,
              address_match_verified: addressVerified,
              verified_at_timestamp: new Date().toISOString()
            })
          }
        },
        legal_attestation: {
          notice_version: "CA-DOJ-2026-V1",
          ab1263_dealer_received_buyer_acceptance: verificationRequest.ab1263_compliance_completed,
          verification_timestamp: new Date().toISOString(),
          attestation_hash: generateCommitmentHash({
            dealer_reference: dealer.dealer_reference_id,
            ab1263_compliance: verificationRequest.ab1263_compliance_completed,
            verification_timestamp: new Date().toISOString()
          }),
          transaction_link_hash: generateCommitmentHash({
            compliance_event_id: complianceEventId,
            dealer_reference: dealer.dealer_reference_id,
            buyer_reference: buyer.buyer_reference_id,
            verification_timestamp: new Date().toISOString()
          })
        }
      };

      // Create compliance event (follows our database function signature)
      const complianceEvent = await createComplianceEvent({
        buyer_id: buyer.id,
        dealer_id: dealer.id,
        buyer_reference_id: buyer.buyer_reference_id,
        dealer_reference_id: dealer.dealer_reference_id,
        verification_data: verificationData,
        age_verified: ageVerified,
        address_verified: addressVerified,
        blockchain_info: {
          network: 'polygon-mainnet',
          transaction_hash: undefined, // Would be set by blockchain service
          contract_address: undefined,
          event_index: undefined,
          block_number: undefined
        }
      });

      // Format response following verificationResponseSchema
      const verificationResponse: VerificationResponse = {
        buyer_email: verificationRequest.buyer_email,
        age_verified: ageVerified,
        address_verified: addressVerified,
        address_match_confidence: addressMatchConfidence,
        normalized_address_used: normalizedBuyerAddress,
        verified_at: new Date().toISOString(),
        compliance_event_id: complianceEvent.id,
        message: ageVerified && addressVerified ? 'Verification successful' : 'Verification completed with limitations',
        zkp_proofs: {
          age_proof_hash: verificationData.zkp_verifications.age_check.commitment_hash,
          address_proof_hash: verificationData.zkp_verifications.address_verification.commitment_hash
        }
      };

      return sendSuccess(reply, verificationResponse, 200);

    } catch (error) {
      console.error('Verification error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid verification request data');
      }
      return sendError(reply, 'Verification failed', 500);
    }
  });

  // Get verification details by ID
  fastify.get('/verify/:verification_id', createRouteSchema({
    tags: ['verification'],
    summary: 'Get verification details',
    description: 'Retrieve details of a specific verification by compliance event ID',
    security: apiKeyRequired,
    params: {
      type: 'object',
      properties: {
        verification_id: {
          type: 'string',
          format: 'uuid',
          description: 'Compliance event ID to retrieve'
        }
      },
      required: ['verification_id']
    }
  }), { preHandler: fastify.authenticateApiKey }, async (request, reply) => {
    try {
      const { verification_id } = request.params as { verification_id: string };
      const dealer = request.dealer!;

      // Get compliance event (follows our database function)
      const complianceEvent = await getComplianceEventById(verification_id);
      
      if (!complianceEvent) {
        return sendError(reply, 'Verification not found', 404);
      }

      // Verify dealer has access to this verification
      if (complianceEvent.dealer_id !== dealer.id) {
        return sendError(reply, 'Access denied', 403, 'This verification does not belong to your account');
      }

      // Format response following our database schema
      const response = {
        compliance_event_id: complianceEvent.id,
        buyer_reference_id: complianceEvent.buyer_reference_id,
        dealer_reference_id: complianceEvent.dealer_reference_id,
        age_verified: complianceEvent.age_verified,
        address_verified: complianceEvent.address_verified,
        verified_at: complianceEvent.verified_at,
        verification_data: complianceEvent.verification_data,
        blockchain_info: complianceEvent.blockchain_info
      };

      return sendSuccess(reply, response, 200);

    } catch (error) {
      console.error('Get verification details error:', error);
      return sendError(reply, 'Failed to get verification details', 500);
    }
  });

  // Get dealer verification history (follows our database function)
  fastify.get('/history', createRouteSchema({
    tags: ['verification'],
    summary: 'Get verification history',
    description: 'Retrieve dealer verification history with optional pagination',
    security: apiKeyRequired,
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        offset: { type: 'integer', minimum: 0, default: 0 },
        start_date: { type: 'string', format: 'date-time' },
        end_date: { type: 'string', format: 'date-time' }
      }
    }
  }), { preHandler: fastify.authenticateApiKey }, async (request, reply) => {
    try {
      const dealer = request.dealer!;
      
      // Get dealer verification history (uses our existing database function)
      const history = await getDealerVerificationHistory(dealer.id);

      // Apply query filters if provided
      const query = request.query as any;
      let filteredHistory = history;

      if (query.start_date) {
        filteredHistory = filteredHistory.filter(event => 
          new Date(event.verified_at) >= new Date(query.start_date)
        );
      }

      if (query.end_date) {
        filteredHistory = filteredHistory.filter(event => 
          new Date(event.verified_at) <= new Date(query.end_date)
        );
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      const paginatedHistory = filteredHistory.slice(offset, offset + limit);

      const response = {
        verifications: paginatedHistory,
        pagination: {
          offset,
          limit,
          total: filteredHistory.length,
          has_more: offset + limit < filteredHistory.length
        }
      };

      return sendSuccess(reply, response, 200);

    } catch (error) {
      console.error('Get verification history error:', error);
      return sendError(reply, 'Failed to get verification history', 500);
    }
  });
}