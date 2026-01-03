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
export interface PaymentUpdateData {
  status?: PaymentStatus;
  payment_provider_info?: Record<string, any>;
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