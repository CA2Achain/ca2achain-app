import { z } from 'zod';
import {
  verificationRequestSchema,
  verificationResponseSchema,
  complianceActionSchema,
  complianceRequirementsSchema,
  batchVerificationRequestSchema,
  batchVerificationResponseSchema,
  verificationStatusSchema,
  privadoProofRequestSchema,
  privadoProofSchema,
  complianceEventSchema,
  createComplianceEventSchema,
  updateComplianceEventSchema,
  dealerRequestSchema,
  blockchainStatusSchema,
  courtVerificationRequestSchema,
  courtVerificationResponseSchema,
  legacyVerificationRequestSchema,
  stripeVerifiedOutputsSchema,
  complianceHistoryRequestSchema,
  ccpaRequestSchema
} from './schema.js';

// =============================================
// CORE INFERRED TYPES
// =============================================

export type VerificationRequest = z.infer<typeof verificationRequestSchema>;
export type VerificationResponse = z.infer<typeof verificationResponseSchema>;
export type ComplianceAction = z.infer<typeof complianceActionSchema>;
export type ComplianceRequirements = z.infer<typeof complianceRequirementsSchema>;
export type BatchVerificationRequest = z.infer<typeof batchVerificationRequestSchema>;
export type BatchVerificationResponse = z.infer<typeof batchVerificationResponseSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

// =============================================
// PRIVADO ID & ZKP TYPES
// =============================================

export type PrivadoProofRequest = z.infer<typeof privadoProofRequestSchema>;
export type PrivadoProof = z.infer<typeof privadoProofSchema>;

// =============================================
// DATABASE & COMPLIANCE TYPES
// =============================================

export type ComplianceEvent = z.infer<typeof complianceEventSchema>;
export type CreateComplianceEvent = z.infer<typeof createComplianceEventSchema>;
export type UpdateComplianceEvent = z.infer<typeof updateComplianceEventSchema>;
export type DealerRequest = z.infer<typeof dealerRequestSchema>;
export type BlockchainStatus = z.infer<typeof blockchainStatusSchema>;

// =============================================
// COURT & LEGAL TYPES
// =============================================

export type CourtVerificationRequest = z.infer<typeof courtVerificationRequestSchema>;
export type CourtVerificationResponse = z.infer<typeof courtVerificationResponseSchema>;

// Extended types for blockchain records
export interface BlockchainComplianceRecord {
  compliance_event: {
    version: 'AB1263-2026.1';
    verification_id: string;
    timestamp: string;
    dealer_id_hash: string;
  };
  privado_proofs: {
    age_verification: {
      proof_hash: string;
      public_signals_hash: string;
      circuit_id: string;
    };
    address_verification: {
      proof_hash: string;
      public_signals_hash: string;
      circuit_id: string;
    };
  };
  legal_compliance: {
    ab1263_disclosure_attested: boolean;
    acknowledgment_attested: boolean;
    dealer_signature_hash: string;
    ca_doj_notice_version: string;
  };
  issuer_authority: {
    issuer_did: string; // Your Privado ID DID
    issuer_signature: string;
    audit_trail_hash: string;
  };
}

// =============================================
// LEGACY & COMPATIBILITY TYPES
// =============================================

export type LegacyVerificationRequest = z.infer<typeof legacyVerificationRequestSchema>;
export type ClaimType = 'age_over_21' | 'age_over_65' | 'address_verified' | 'identity_verified';
export type StripeVerifiedOutputs = z.infer<typeof stripeVerifiedOutputsSchema>;

// =============================================
// COMPLIANCE & CCPA TYPES  
// =============================================

export type ComplianceHistoryRequest = z.infer<typeof complianceHistoryRequestSchema>;
export type CCPARequest = z.infer<typeof ccpaRequestSchema>;

// Compliance API responses
export interface ComplianceHistoryResponse {
  success: boolean;
  events: ComplianceEvent[];
  total_events: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CCPAResponse {
  success: boolean;
  request_id: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  data_export_url?: string;
}

// CCPA deletion tracking
export interface CCPADeletionStatus {
  account_deleted: boolean;
  compliance_events_anonymized: boolean;
  payment_records_anonymized: boolean;
  blockchain_records_preserved: boolean;
  deletion_timestamp?: string;
}

// Customer reference patterns for compliance events
export interface CustomerReferences {
  buyer_reference_id?: string; // 'BUY_a8b9c2d1'
  dealer_reference_id?: string; // 'DLR_f3e4d5c6'
}

// Blockchain proof data
export interface BlockchainProofs {
  blockchain_transaction_hash?: string;
  zero_knowledge_proof_hash?: string;
}

// Compliance event with customer references (survives account deletion)
export interface ComplianceEventWithReferences extends ComplianceEvent {
  customer_references: CustomerReferences;
  blockchain_proofs: BlockchainProofs;
  deletion_status: {
    buyer_deleted: boolean;
    buyer_deleted_at?: string;
    dealer_deleted: boolean;
    dealer_deleted_at?: string;
  };
}

// =============================================
// AB 1263 SPECIFIC TYPES
// =============================================

export type AB1263Status = 'VALIDATED' | 'FAILED' | 'PENDING' | 'ERROR';
export type ComplianceActionCode = 'ADULT_SIG_21' | 'BOX_LABELING' | 'AGE_VERIFICATION' | 'CA_RESIDENT_ONLY';
export type VerificationResult = 'PASS' | 'FAIL';

// =============================================
// STANDARD COMPLIANCE ACTIONS
// =============================================

// Standard compliance actions for AB 1263
export const STANDARD_COMPLIANCE_ACTIONS: Record<ComplianceActionCode, ComplianceAction> = {
  ADULT_SIG_21: {
    code: 'ADULT_SIG_21',
    instruction: 'This shipment MUST be sent via \'Adult Signature Required\' (21+) per CA AB 1263.',
    requirement_source: 'CA Civil Code § 3273.61.1(c)',
    penalty_for_noncompliance: 'Civil penalty up to $10,000 per violation'
  },
  BOX_LABELING: {
    code: 'BOX_LABELING',
    instruction: 'Package must be conspicuously labeled: \'Signature and proof of identification of person aged 18 years or older required for delivery.\'',
    requirement_source: 'CA Civil Code § 3273.61.1(a)',
    penalty_for_noncompliance: 'Civil penalty up to $10,000 per violation'
  },
  AGE_VERIFICATION: {
    code: 'AGE_VERIFICATION',
    instruction: 'Buyer age verification (18+) completed via CA2AChain zero-knowledge proof system.',
    requirement_source: 'CA Civil Code § 3273.61.1(b)',
    penalty_for_noncompliance: 'Criminal liability for sales to minors'
  },
  CA_RESIDENT_ONLY: {
    code: 'CA_RESIDENT_ONLY',
    instruction: 'Shipment authorized only to verified California residents per AB 1263 requirements.',
    requirement_source: 'CA Civil Code § 3273.61.1(d)',
    penalty_for_noncompliance: 'Violation of interstate commerce regulations'
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

// Helper function to generate standard compliance requirements
export function createStandardComplianceRequirements(
  verificationResult: VerificationResult,
  ageVerified: boolean,
  addressVerified: boolean
): ComplianceRequirements {
  const actions: ComplianceAction[] = [];
  
  if (verificationResult === 'PASS') {
    // Add mandatory actions for successful verification
    actions.push(STANDARD_COMPLIANCE_ACTIONS.AGE_VERIFICATION);
    actions.push(STANDARD_COMPLIANCE_ACTIONS.ADULT_SIG_21);
    actions.push(STANDARD_COMPLIANCE_ACTIONS.BOX_LABELING);
    
    if (addressVerified) {
      actions.push(STANDARD_COMPLIANCE_ACTIONS.CA_RESIDENT_ONLY);
    }
  }

  return {
    ab1263_status: verificationResult === 'PASS' ? 'VALIDATED' : 'FAILED',
    mandatory_actions: actions,
    compliance_version: 'AB1263-2026.1',
    legal_disclaimers: [
      'This verification meets CA AB 1263 requirements as of the compliance version specified.',
      'Dealer is responsible for following all mandatory actions to maintain compliance.',
      'CA2AChain provides verification services only and assumes no liability for shipping compliance.'
    ],
    next_steps: verificationResult === 'PASS' ? [
      'Proceed with shipment following all mandatory actions',
      'Retain verification ID for audit purposes',
      'Ensure package labeling compliance before shipment'
    ] : [
      'Do not proceed with shipment to this buyer',
      'Buyer must complete identity verification first',
      'Contact buyer to resolve verification issues'
    ]
  };
}

// =============================================
// ADDITIONAL API RESPONSE INTERFACES (from original)
// =============================================

// Legacy VerificationResponse for compatibility
export interface LegacyVerificationResponse {
  verification_id: string;
  verified: boolean;
  age_verified: boolean;
  address_verified: boolean;
  confidence_score: number;
  privado_proof_hashes: string[];
  blockchain_pending: boolean;
  disclaimers: string[];
  legal_notice: string;
}

// Legacy batch verification types (kept for compatibility)
export interface LegacyBatchVerificationRequest {
  verifications: VerificationRequest[];
}

export interface LegacyBatchVerificationResponse {
  results: Array<{
    buyer_email: string;
    transaction_id: string;
    result: boolean;
    verification_id?: string;
    error?: string;
    timestamp: string;
  }>;
}