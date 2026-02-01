import { z } from 'zod';
import { PaymentStatus } from '../../common/type.js';
import {
  paymentSchema,
  createPaymentSchema,
  updatePaymentSchema,
  customerPaymentHistorySchema
} from './schema.js';

// Inferred types from Zod schemas
export type Payment = z.infer<typeof paymentSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
export type CustomerPaymentHistory = z.infer<typeof customerPaymentHistorySchema>;

// Transaction type enum
export type TransactionType = 'verification' | 'subscription';

// Account type enum  
export type AccountType = 'buyer' | 'dealer';

// Customer reference patterns
export interface CustomerReference {
  id: string; // e.g., 'BUY_a8b9c2d1' or 'DLR_f3e4d5c6'
  type: AccountType;
  hash: string; // The 8-character hash portion
}

// Payment creation data (what backend needs)
export interface PaymentCreationData {
  buyer_id?: string;
  dealer_id?: string;
  transaction_type: TransactionType;
  amount_cents: number;
  customer_reference_id: string;
  payment_provider_info?: Record<string, any>;
}

// Payment update data (for webhooks)
// NEW: Added stripe_info with error_message support
export interface PaymentUpdateData {
  status?: PaymentStatus;
  payment_provider_info?: {
    stripe_info?: {
      stripe_customer_id?: string;
      stripe_payment_method_id?: string;
      stripe_payment_intent_id?: string;
      authorized_at?: string;
      captured_at?: string;
      refunded_at?: string;
      refund_reason?: string;
      error_message?: string;  // NEW: For ID verification failures, payment errors
    };
    credit_card_info?: any;
  };
}

// Webhook event types
export type StripeWebhookEvent = 
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed' 
  | 'payment_intent.canceled';

// API response interfaces
export interface PaymentApiResponse {
  success?: boolean;
  error?: string;
  payments?: Payment[];
}

// Refund request interface
export interface RefundRequest {
  payment_id: string;
  amount_cents?: number; // Optional for partial refunds
  reason?: string;
}

// Refund response interface
export interface RefundResponse {
  success: boolean;
  refund_id?: string;
  amount_refunded?: number;
  error?: string;
}

// NEW: Payment error details (for display to user or logging)
export interface PaymentErrorInfo {
  payment_id: string;
  error_type: 'id_verification_failed' | 'payment_method_declined' | 'stripe_error' | 'unknown';
  error_message: string;
  stripe_payment_intent_id?: string;
  timestamp: string;
}