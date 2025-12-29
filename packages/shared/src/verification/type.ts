import { z } from 'zod';
import { AddressString, NormalizedAddress } from '../common/type.js';
import {
  verificationRequestSchema,
  privadoAgeProofSchema,
  privadoAddressProofSchema,
  blockchainInfoSchema,
  complianceEventSchema,
  verificationDataSchema,
  verificationResponseSchema,
  complianceHistoryRequestSchema,
  ccpaRequestSchema
} from './schema.js';

// =============================================
// CORE TYPES (FROM SCHEMAS)
// =============================================

// Dealer API types
export type VerificationRequest = z.infer<typeof verificationRequestSchema>;
export type VerificationResponse = z.infer<typeof verificationResponseSchema>;

// Privado ZKP types
export type PrivadoAgeProof = z.infer<typeof privadoAgeProofSchema>;
export type PrivadoAddressProof = z.infer<typeof privadoAddressProofSchema>;

// Database types
export type ComplianceEvent = z.infer<typeof complianceEventSchema>;
export type BlockchainInfo = z.infer<typeof blockchainInfoSchema>;
export type VerificationData = z.infer<typeof verificationDataSchema>;

// CCPA types
export type ComplianceHistoryRequest = z.infer<typeof complianceHistoryRequestSchema>;
export type CCPARequest = z.infer<typeof ccpaRequestSchema>;

// =============================================
// HASH COMMITMENT TYPES (FOR BLOCKCHAIN)
// =============================================

// Age commitment hash data structure
export interface AgeCommitment {
  zkp_age_proof: string; // Privado proof JSON
  buyer_reference: string; // 'BUY_a8b9c2d1'
  buyer_secret: string; // buyer_uuid_hash
  age_verified: boolean;
  verified_at_timestamp: string; // ISO timestamp
}

// Address match commitment hash data structure
export interface AddressMatchCommitment {
  zkp_address_proof: string; // Privado proof JSON
  buyer_reference: string; // 'BUY_a8b9c2d1'
  normalized_buyer_address: string; // Uses normalized address format
  dealer_reference: string; // 'DLR_f3e4d5c6'
  normalized_shipping_address: string; // Uses normalized address format
  match_confidence: number; // 0.0 to 1.0
  address_match_verified: boolean;
  verified_at_timestamp: string; // ISO timestamp
}

// Notice attestation hash data structure
export interface NoticeAttestation {
  dealer_reference: string; // 'DLR_f3e4d5c6'
  notice_version: 'CA-DOJ-2026-V1';
  ab1263_dealer_received_buyer_acceptance: boolean;
  buyer_reference: string; // 'BUY_a8b9c2d1'
  verification_timestamp: string; // ISO timestamp
}

// Transaction link hash data structure
export interface TransactionLink {
  compliance_event_id: string; // compliance_events.id UUID
  buyer_reference: string; // 'BUY_a8b9c2d1'
  dealer_reference: string; // 'DLR_f3e4d5c6'
}

// =============================================
// API RESPONSE INTERFACES
// =============================================

// Compliance history response
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

// CCPA request response
export interface CCPAResponse {
  success: boolean;
  request_id: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  data_export_url?: string;
}