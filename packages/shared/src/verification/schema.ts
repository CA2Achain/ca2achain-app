import { z } from 'zod';

// =============================================
// CORE VERIFICATION SCHEMAS
// =============================================

// AB 1263 verification request from dealer
export const verificationRequestSchema = z.object({
  buyer_email: z.string().email(),
  buyer_dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  shipping_address: z.string().min(10, 'Complete shipping address required'),
  transaction_id: z.string().min(1, 'Transaction ID required for audit trail'),
  ab1263_disclosure_presented: z.boolean().refine(val => val === true, {
    message: 'AB 1263 disclosure must be presented to buyer'
  }),
  acknowledgment_received: z.boolean().refine(val => val === true, {
    message: 'Buyer acknowledgment required for compliance'
  }),
});

// =============================================
// PRIVADO ID ZKP SCHEMAS
// =============================================

// Privado ID proof request structure
export const privadoProofRequestSchema = z.object({
  circuitId: z.string(),
  query: z.object({
    allowedIssuers: z.array(z.string()), // Your issuer DID
    type: z.string(), // IdentityVerificationCredential
    context: z.string().url(),
    credentialSubject: z.record(z.any()), // Claims to prove
  }),
});

// ZK Proof response from Privado ID (with clearer field names)
export const privadoProofSchema = z.object({
  proof: z.object({
    proof_a: z.array(z.string()), // First element of Groth16 proof
    proof_b: z.array(z.array(z.string())), // Second element of Groth16 proof  
    proof_c: z.array(z.string()), // Third element of Groth16 proof
    protocol: z.literal('groth16'),
  }),
  public_signals: z.array(z.string()),
});

// =============================================
// COMPLIANCE & LEGAL SCHEMAS
// =============================================

// Mandatory action for AB 1263 compliance
export const complianceActionSchema = z.object({
  code: z.enum(['ADULT_SIG_21', 'BOX_LABELING', 'AGE_VERIFICATION', 'CA_RESIDENT_ONLY']),
  instruction: z.string(),
  requirement_source: z.string(), // Legal citation
  penalty_for_noncompliance: z.string().optional(),
});

// Legal compliance requirements to send back to dealer
export const complianceRequirementsSchema = z.object({
  ab1263_status: z.enum(['VALIDATED', 'FAILED', 'PENDING', 'ERROR']),
  mandatory_actions: z.array(complianceActionSchema),
  compliance_version: z.string().default('AB1263-2026.1'),
  legal_disclaimers: z.array(z.string()).optional(),
  next_steps: z.array(z.string()).optional(),
});

// =============================================
// DATABASE RECORD SCHEMAS
// =============================================

// Structured dealer request (internal storage)
export const dealerRequestSchema = z.object({
  buyer_email: z.string().email(),
  buyer_dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shipping_address: z.string().min(10),
  transaction_id: z.string(),
  ab1263_disclosure_presented: z.boolean(),
  acknowledgment_received: z.boolean(),
  ip_address: z.string().ip(),
  user_agent: z.string(),
  timestamp: z.string().datetime(),
});

// Consistent blockchain status enum
export const blockchainStatusSchema = z.enum(['pending', 'submitted', 'confirmed', 'failed']);

// Complete compliance event record (database)
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

// Blockchain information schema for JSON storage
export const blockchainInfoSchema = z.object({
  network: z.string().default('polygon-mainnet'),
  transaction_hash: z.string().optional(),
  contract_address: z.string().optional(),
  event_index: z.number().int().optional(),
  block_number: z.number().int().optional(),
});

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
      zkp_age_proof: z.string(), // Privado proof
      buyer_secret: z.string(), // buyer_uuid_hash
      age_verified: z.boolean(),
      verified_at_timestamp: z.string().datetime(),
      commitment_hash: z.string(), // AgeCommitment_Hash
    }),
    address_verification: z.object({
      zkp_address_proof: z.string(), // Privado proof  
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

// Compliance event update (for verification results)
export const updateComplianceEventSchema = z.object({
  verification_status: z.enum(['pending', 'approved', 'denied', 'expired']).optional(),
  verification_response: z.record(z.any()).optional(),
  blockchain_transaction_hash: z.string().optional(),
  zero_knowledge_proof_hash: z.string().optional(),
});

// =============================================
// API RESPONSE SCHEMAS
// =============================================

// Complete verification response to dealer
export const verificationResponseSchema = z.object({
  success: z.boolean(),
  verification_id: z.string(),
  verification_result: z.enum(['PASS', 'FAIL']),
  age_verified: z.boolean(),
  address_verified: z.boolean(),
  confidence_score: z.number().min(0).max(100),
  timestamp: z.string().datetime(),
  ab1263_compliance: z.object({
    disclosure_presented: z.boolean(),
    acknowledgment_received: z.boolean(),
    compliance_version: z.string(),
  }),
  compliance_requirements: complianceRequirementsSchema,
  message: z.string(),
  // Note: No PII is ever returned to dealers
});

// Batch verification request
export const batchVerificationRequestSchema = z.object({
  verifications: z.array(verificationRequestSchema).min(1).max(50),
});

// Batch verification response
export const batchVerificationResponseSchema = z.object({
  success: z.boolean(),
  batch_id: z.string(),
  total_verifications: z.number(),
  results: z.array(z.object({
    transaction_id: z.string(),
    buyer_email: z.string(),
    verification_result: z.enum(['PASS', 'FAIL']),
    verification_id: z.string().optional(),
    age_verified: z.boolean().optional(),
    address_verified: z.boolean().optional(),
    confidence_score: z.number().optional(),
    compliance_requirements: complianceRequirementsSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime(),
  })),
  timestamp: z.string().datetime(),
});

// Verification status lookup response
export const verificationStatusSchema = z.object({
  success: z.boolean(),
  verification_id: z.string(),
  status: z.enum(['completed', 'pending', 'failed', 'expired']),
  verification_result: z.enum(['PASS', 'FAIL']).optional(),
  timestamp: z.string().datetime(),
  blockchain_status: blockchainStatusSchema.optional(),
  compliance_requirements: complianceRequirementsSchema.optional(),
});

// =============================================
// COURT/LEGAL VERIFICATION SCHEMAS
// =============================================

// Court verification request (for legal proceedings)
export const courtVerificationRequestSchema = z.object({
  verification_id: z.string(),
  court_order_reference: z.string(),
  requesting_authority: z.string(),
});

// Court verification response with blockchain proof
export const courtVerificationResponseSchema = z.object({
  verification_id: z.string(),
  blockchain_proof: z.object({
    polygon_tx_hash: z.string(),
    block_number: z.number(),
    timestamp: z.string(),
    compliance_record: z.any(), // BlockchainComplianceRecord - defined in types
  }),
  privado_proof_verification: z.object({
    age_proof_valid: z.boolean(),
    address_proof_valid: z.boolean(),
    proofs_mathematically_verified: z.boolean(),
  }),
  data_availability: z.object({
    buyer_data_available: z.boolean(),
    ccpa_deletion_status: z.string().optional(),
  }),
});

// =============================================
// LEGACY SCHEMAS (for backward compatibility)
// =============================================

export const legacyVerificationRequestSchema = z.object({
  user_email: z.string().email(),
  claim_type: z.enum(['age_over_21', 'age_over_65', 'address_verified', 'identity_verified']),
});

export const stripeVerifiedOutputsSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  dob: z.object({
    day: z.number(),
    month: z.number(),
    year: z.number(),
  }),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  id_number: z.string(),
});

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

// =============================================
// COMPLIANCE & CCPA SCHEMAS
// =============================================

// Compliance history request (admin/audit functionality)
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