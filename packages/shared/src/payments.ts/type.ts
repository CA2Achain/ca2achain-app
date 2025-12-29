import { z } from 'zod';
import {
  paymentSchema,
  paymentHistorySchema,
  transactionTypeSummarySchema,
  customerPaymentHistorySchema
} from './schema.js';

// Inferred types from Zod schemas
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentHistory = z.infer<typeof paymentHistorySchema>;
export type TransactionTypeSummary = z.infer<typeof transactionTypeSummarySchema>;
export type CustomerPaymentHistory = z.infer<typeof customerPaymentHistorySchema>;

// Payment status enum type
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

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
  stripe_payment_intent_id: string;
  account_id: string;
  account_type: AccountType;
  transaction_type: TransactionType;
  amount_cents: number;
  payment_timestamp: string;
  status: PaymentStatus;
}

// Payment update data (for webhooks)
export interface PaymentUpdateData {
  status?: PaymentStatus;
  payment_timestamp?: string;
}

// Revenue summary (for business intelligence)
export interface RevenueSummary {
  total_payments: number;
  total_revenue_cents: number;
  success_rate: number; // percentage of successful payments
  average_payment_cents: number;
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

export interface CustomerReferenceApiResponse {
  customer_reference_id: string;
  total_payments: number;
  payments: Array<{
    id: string;
    transaction_type: TransactionType;
    amount_cents: number;
    status: PaymentStatus;
    payment_timestamp: string;
    account_active: boolean;
  }>;
}