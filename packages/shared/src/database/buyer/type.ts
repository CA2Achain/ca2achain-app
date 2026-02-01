import { z } from 'zod';
import {
  buyerRegistrationSchema,
  buyerAccountSchema,
  buyerProfileUpdateSchema,
} from './schema.js';

// =============================================
// BUYER REGISTRATION
// =============================================

/**
 * Request to register a new buyer account
 */
export type BuyerRegistration = z.infer<typeof buyerRegistrationSchema>;

// =============================================
// BUYER ACCOUNT
// =============================================

/**
 * Complete buyer account database entity
 * Includes all fields from buyer_accounts table
 */
export type BuyerAccount = z.infer<typeof buyerAccountSchema>;

/**
 * Buyer profile update request
 */
export type BuyerProfileUpdate = z.infer<typeof buyerProfileUpdateSchema>;

// =============================================
// PAYMENT STATUS ENUM
// =============================================

/**
 * Payment status state machine for safe capture flow
 * 
 * Flow: pending → authorized → id_check_started → id_check_passed → completed
 * 
 * States:
 * - pending: User clicked "Buy", hasn't submitted payment form yet
 * - authorized: Stripe authorized funds (manual capture enabled, funds held, NOT charged)
 * - id_check_started: Persona inquiry created, user starting ID verification
 * - id_check_passed: Persona webhook confirmed ID verification successful
 * - completed: Stripe captured funds, full verification complete (USER CHARGED)
 * - failed: Payment method declined OR ID check failed
 * - authorized_refunded: Stripe refunded authorized hold (ID check failed before capture, NO CHARGE)
 * - completed_refunded: Stripe refunded captured payment (buyer refund request)
 * - error: Unexpected error state (requires manual intervention)
 */
export type BuyerPaymentStatus =
  | 'pending'
  | 'authorized'
  | 'id_check_started'
  | 'id_check_passed'
  | 'completed'
  | 'failed'
  | 'authorized_refunded'
  | 'completed_refunded'
  | 'error';

// =============================================
// VERIFICATION STATUS ENUM
// =============================================

/**
 * Verification status state machine
 * 
 * States:
 * - pending: Default, no verification started
 * - id_check_started: Persona inquiry created, ID verification in progress
 * - id_check_passed: Persona confirmed ID verification successful
 * - verified: Complete verification (payment captured, full account activated)
 * - expired: Verification expired (needs re-verification)
 * - rejected: ID verification failed (user can retry or contact support)
 */
export type BuyerVerificationStatus =
  | 'pending'
  | 'id_check_started'
  | 'id_check_passed'
  | 'verified'
  | 'expired'
  | 'rejected';

// =============================================
// RESPONSE TYPES
// =============================================

/**
 * Response when buyer registers
 */
export interface BuyerRegistrationResponse {
  success: boolean;
  buyer_id?: string;
  buyer_reference_id?: string;
  verification_required?: boolean;
  error?: string;
}

/**
 * Response for buyer profile queries
 */
export interface BuyerProfileResponse {
  success: boolean;
  buyer: BuyerAccount;
}

/**
 * Response for verification status queries
 */
export interface BuyerVerificationStatusResponse {
  payment_status: BuyerPaymentStatus;
  verification_status: BuyerVerificationStatus;
  verified_at?: string;
  payment_error_message?: string;
  message: string;
}

/**
 * Response for verification history
 */
export interface BuyerVerificationHistory {
  verification_id: string;
  status: BuyerVerificationStatus;
  created_at: string;
  completed_at?: string;
  verified_data?: Record<string, unknown>;
}

/**
 * Response wrapper for verification history query
 * NEW: For API responses with success flag
 */
export interface BuyerVerificationHistoryResponse {
  success: boolean;
  history: BuyerVerificationHistory;
}

// =============================================
// CCPA DATA REQUEST TYPES
// =============================================

export type DataRequestType = 'export' | 'delete_data' | 'delete_account';

/**
 * CCPA data request (export, delete, etc)
 */
export interface BuyerDataRequest {
  request_type: DataRequestType;
  requested_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at?: string;
  error?: string;
}

/**
 * CCPA data export response
 */
export interface BuyerDataExport {
  buyer_id: string;
  buyer_reference_id: string;
  personal_data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  verification_data?: Record<string, unknown>;
  payment_history: Array<{
    payment_id: string;
    amount_cents: number;
    status: string;
    created_at: string;
  }>;
  export_timestamp: string;
}

/**
 * Response wrapper for CCPA data export
 * NEW: For API responses with success flag
 */
export interface BuyerCCPAExportResponse {
  success: boolean;
  data: BuyerDataExport;
  export_timestamp: string;
}

/**
 * Response wrapper for CCPA data deletion
 * NEW: For API responses with success flag
 */
export interface BuyerCCPADeleteResponse {
  success: boolean;
  message: string;
  deletion_initiated_at: string;
}