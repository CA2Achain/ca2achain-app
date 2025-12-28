import { z } from 'zod';
import { 
  verificationRequestSchema,
  privadoProofRequestSchema,
  privadoProofSchema,
  complianceEventSchema,
  dealerRequestSchema,
  blockchainStatusSchema
} from './schema.js';

// Inferred types from schemas
export type VerificationRequest = z.infer<typeof verificationRequestSchema>;
export type PrivadoProofRequest = z.infer<typeof privadoProofRequestSchema>;
export type PrivadoProof = z.infer<typeof privadoProofSchema>;
export type ComplianceEvent = z.infer<typeof complianceEventSchema>;
export type DealerRequest = z.infer<typeof dealerRequestSchema>; // ADDED - was missing
export type BlockchainStatus = z.infer<typeof blockchainStatusSchema>; // ADDED - was missing

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

// API Response types
export interface VerificationResponse {
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

// Batch verification types
export interface BatchVerificationRequest {
  verifications: VerificationRequest[]; // UPDATED - use proper type instead of inline
}

export interface BatchVerificationResponse {
  results: Array<{
    buyer_email: string;
    transaction_id: string;
    result: boolean;
    verification_id?: string;
    error?: string;
    timestamp: string;
  }>;
}

// Court verification types
export interface CourtVerificationRequest {
  verification_id: string;
  court_order_reference: string;
  requesting_authority: string;
}

export interface CourtVerificationResponse {
  verification_id: string;
  blockchain_proof: {
    polygon_tx_hash: string;
    block_number: number;
    timestamp: string;
    compliance_record: BlockchainComplianceRecord;
  };
  privado_proof_verification: {
    age_proof_valid: boolean;
    address_proof_valid: boolean;
    proofs_mathematically_verified: boolean;
  };
  data_availability: {
    buyer_data_available: boolean;
    ccpa_deletion_status?: string;
  };
}