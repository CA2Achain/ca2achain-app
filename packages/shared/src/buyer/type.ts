import { z } from 'zod';
import { buyerRegistrationSchema, buyerAccountSchema, privadoClaimsSchema, buyerSecretsSchema } from './schema.js';

// Inferred types from schemas
export type BuyerRegistration = z.infer<typeof buyerRegistrationSchema>;
export type BuyerAccount = z.infer<typeof buyerAccountSchema>;
export type PrivadoClaims = z.infer<typeof privadoClaimsSchema>;
export type BuyerSecrets = z.infer<typeof buyerSecretsSchema>;

// Extended types for Privado ID
export interface PrivadoCredential {
  id: string;
  type: ['VerifiableCredential', 'IdentityVerificationCredential'];
  issuer: string; // Your DID
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string; // Buyer's DID
    claims: PrivadoClaims;
  };
  proof: {
    type: 'BJJSignature2021';
    signature: string;
    issuerData: any;
  };
}

export interface PersonaData {
  name: string;
  dob: string;
  dl_number: string;
  dl_expiration: string;
  address_original: string;
  address_normalized: string;
  verification_session_id: string;
}

// Buyer status information
export interface BuyerStatus {
  verified: boolean;
  verified_at?: string;
  expires_at?: string;
  is_expired: boolean;
  needs_reverification: boolean;
  has_data: boolean;
  payment_status: 'pending' | 'paid' | 'refunded';
}

// Buyer audit log view
export interface BuyerAuditLog {
  verification_id: string;
  dealer_company_name: string;
  verified_claims: string[];
  timestamp: string;
  result: 'approved' | 'denied';
}