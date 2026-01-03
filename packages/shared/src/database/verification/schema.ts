import { z } from 'zod';
import { addressStringSchema } from '../../common/schema.js';

// =============================================
// DEALER API SCHEMAS
// =============================================

// Dealer verification request to our API
export const verificationRequestSchema = z.object({
  buyer_email: z.string().email(),
  shipping_address: addressStringSchema, // Use common address schema
  ab1263_compliance_completed: z.boolean().refine(val => val === true, {
    message: 'AB 1263 compliance must be completed before API request'
  }),
});

// Enhanced verification response to dealer
export const verificationResponseSchema = z.object({
  // Echo back dealer's request data
  buyer_email: z.string().email(), // Same email dealer provided
  
  // Verification results (clear boolean outcomes)
  age_verified: z.boolean(), // Age verification met (18+)
  address_verified: z.boolean(), // Address match verification met
  address_match_confidence: z.number().min(0).max(1), // Match confidence score
  normalized_address_used: z.string(), // Normalized address used in verification
  
  // Timestamps and tracking
  verified_at: z.string().datetime(), // When verification was performed
  compliance_event_id: z.string().uuid(), // Our internal tracking ID
  
  // Optional message for errors/details
  message: z.string().optional(),
  
  // ZKP Proofs - Include for transparency and audit purposes
  zkp_proofs: z.object({
    age_proof_hash: z.string(), // Hash of ZKP age proof (not full proof)
    address_proof_hash: z.string(), // Hash of ZKP address proof (not full proof) 
  }).optional(),
});

// =============================================
// PRIVADO ZKP SCHEMAS
// =============================================

// Privado ID proof structure for age verification
export const privadoAgeProofSchema = z.object({
  proof: z.object({
    proof_a: z.array(z.string()),
    proof_b: z.array(z.array(z.string())),
    proof_c: z.array(z.string()),
    protocol: z.literal('groth16'),
  }),
  public_signals: z.array(z.string()),
});

// Privado ID proof structure for address verification
export const privadoAddressProofSchema = z.object({
  proof: z.object({
    proof_a: z.array(z.string()),
    proof_b: z.array(z.array(z.string())), 
    proof_c: z.array(z.string()),
    protocol: z.literal('groth16'),
  }),
  public_signals: z.array(z.string()),
});

// =============================================
// BLOCKCHAIN INTEGRATION SCHEMAS
// =============================================

// Blockchain information schema for JSON storage
export const blockchainInfoSchema = z.object({
  network: z.string().default('polygon-mainnet'),
  transaction_hash: z.string().optional(),
  contract_address: z.string().optional(),
  event_index: z.number().int().optional(),
  block_number: z.number().int().optional(),
});

// =============================================
// COMPLIANCE EVENTS SCHEMA
// =============================================

// Main compliance events table schema
export const complianceEventSchema = z.object({
  id: z.string().uuid(), // UUIDv7 for chronological ordering - serves as verification identifier
  
  // Efficient querying (nullable for CCPA compliance)
  buyer_id: z.string().uuid().nullable(),
  dealer_id: z.string().uuid().nullable(),
  
  // Immutable audit trail (survive deletions)
  buyer_reference_id: z.string(), // 'BUY_a8b9c2d1' - CCPA compliant
  dealer_reference_id: z.string(), // 'DLR_f3e4d5c6' - Business continuity
  
  // Complete verification record (enhanced JSON structure for hash reproducibility)
  verification_data: z.record(z.any()), // Enhanced JSON with ZKP proofs + commitment hashes
  
  // Quick-access verification results (extracted from JSON for efficient queries)
  age_verified: z.boolean(),
  address_verified: z.boolean(),
  
  // Blockchain integration (single JSON blob)
  blockchain_info: blockchainInfoSchema.optional(),
  
  verified_at: z.string().datetime(),
});

// =============================================
// VERIFICATION DATA STRUCTURE (FOR HASH REPRODUCIBILITY)
// =============================================

// Enhanced verification data structure for blockchain hash reproducibility
export const verificationDataSchema = z.object({
  compliance_event: z.object({
    version: z.literal("AB1263-2026.1"),
    compliance_event_id: z.string().uuid(), // Main compliance_events.id
    timestamp: z.string().datetime(),
    buyer_reference: z.string(), // 'BUY_a8b9c2d1'
    dealer_reference: z.string(), // 'DLR_f3e4d5c6'
  }),
  zkp_verifications: z.object({
    age_check: z.object({
      zkp_age_proof: z.string(), // Privado proof JSON
      buyer_secret: z.string(), // buyer_uuid_hash
      date_of_birth: z.string().date(), // YYYY-MM-DD format for hash reproducibility
      age_verified: z.boolean(),
      verified_at_timestamp: z.string().datetime(),
      commitment_hash: z.string(), // AgeCommitment_Hash
    }),
    address_verification: z.object({
      zkp_address_proof: z.string(), // Privado proof JSON
      normalized_buyer_address: z.string(),
      normalized_shipping_address: z.string(),
      match_confidence: z.number().min(0).max(1),
      address_match_verified: z.boolean(),
      verified_at_timestamp: z.string().datetime(),
      commitment_hash: z.string(), // Address_Match_Commitment_Hash
    })
  }),
  legal_attestation: z.object({
    notice_version: z.literal("CA-DOJ-2026-V1"),
    ab1263_dealer_received_buyer_acceptance: z.boolean(),
    verification_timestamp: z.string().datetime(),
    attestation_hash: z.string(), // Dealer_Attestation_Hash
    transaction_link_hash: z.string(), // Transaction_Link_Hash
  })
});

// =============================================
// CCPA COMPLIANCE SCHEMAS  
// =============================================

// CCPA compliance history request
export const complianceHistoryRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  buyer_id: z.string().uuid().optional(),
  dealer_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// CCPA data request schema
export const ccpaRequestSchema = z.object({
  request_type: z.enum(['export', 'delete_data', 'delete_account']),
  user_email: z.string().email(),
  verification_required: z.boolean().default(true),
});