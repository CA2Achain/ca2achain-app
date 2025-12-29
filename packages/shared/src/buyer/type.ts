import { z } from 'zod';
import {
  buyerRegistrationSchema,
  buyerAccountSchema,
  privadoClaimsSchema,
  buyerSecretsSchema,
  buyerProfileUpdateSchema,
  buyerDataRequestSchema
} from './schema.js';

// Inferred types from Zod schemas
export type BuyerRegistration = z.infer<typeof buyerRegistrationSchema>;
export type BuyerAccount = z.infer<typeof buyerAccountSchema>;
export type PrivadoClaims = z.infer<typeof privadoClaimsSchema>;
export type BuyerSecrets = z.infer<typeof buyerSecretsSchema>;
export type BuyerProfileUpdate = z.infer<typeof buyerProfileUpdateSchema>;
export type BuyerDataRequest = z.infer<typeof buyerDataRequestSchema>;

// Verification status enum (for buyer accounts)
export type BuyerVerificationStatus = 'pending' | 'verified' | 'expired' | 'rejected';

// Payment status enum (for buyer accounts)
export type BuyerPaymentStatus = 'pending' | 'paid' | 'refunded';

// CCPA request types
export type DataRequestType = 'export' | 'delete_data' | 'delete_account';

// API response types
export interface BuyerRegistrationResponse {
  success: boolean;
  buyer_id?: string;
  verification_required?: boolean;
  error?: string;
}

export interface BuyerProfileResponse {
  success: boolean;
  buyer: BuyerAccount;
}

export interface BuyerVerificationResponse {
  success: boolean;
  verification_status: BuyerVerificationStatus;
  verification_expires_at?: string;
  privado_credential?: PrivadoClaims;
}