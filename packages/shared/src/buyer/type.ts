import { z } from 'zod';
import { PaymentStatus } from '../common/type.js';
import {
  buyerRegistrationSchema,
  buyerAccountSchema,
  buyerProfileUpdateSchema,
  buyerVerificationHistorySchema,
  buyerDataRequestSchema,
  buyerDataExportSchema
} from './schema.js';

// =============================================
// BUYER ACCOUNT TYPES
// =============================================

// Inferred types from account schemas
export type BuyerRegistration = z.infer<typeof buyerRegistrationSchema>;
export type BuyerAccount = z.infer<typeof buyerAccountSchema>;
export type BuyerProfileUpdate = z.infer<typeof buyerProfileUpdateSchema>;

// Verification status enum (for buyer accounts)
export type BuyerVerificationStatus = 'pending' | 'verified' | 'expired' | 'rejected';

// =============================================
// VERIFICATION INTEGRATION TYPES
// =============================================

// Verification history type
export type BuyerVerificationHistory = z.infer<typeof buyerVerificationHistorySchema>;

// =============================================
// CCPA COMPLIANCE TYPES
// =============================================

// CCPA request types
export type DataRequestType = 'export' | 'delete_data' | 'delete_account';
export type BuyerDataRequest = z.infer<typeof buyerDataRequestSchema>;
export type BuyerDataExport = z.infer<typeof buyerDataExportSchema>;

// =============================================
// API RESPONSE TYPES
// =============================================

// Basic account management responses
export interface BuyerRegistrationResponse {
  success: boolean;
  buyer_id?: string;
  buyer_reference_id?: string; // 'BUY_a8b9c2d1'
  verification_required?: boolean;
  error?: string;
}

export interface BuyerProfileResponse {
  success: boolean;
  buyer: BuyerAccount;
}