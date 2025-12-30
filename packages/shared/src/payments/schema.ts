import { z } from 'zod';
import { paymentStatusSchema, paymentProviderInfoSchema } from '../common/schema.js';

// =============================================
// PAYMENT SCHEMAS
// =============================================

// Main payments table schema (matches new database structure)
export const paymentSchema = z.object({
  id: z.string().uuid(), // UUIDv7 for chronological ordering
  
  // Specific account references (one will be null)
  buyer_id: z.string().uuid().nullable(),
  dealer_id: z.string().uuid().nullable(),
  
  // Payment details
  transaction_type: z.enum(['verification', 'subscription']),
  amount_cents: z.number().int(),
  status: paymentStatusSchema, // Use common payment status enum
  
  // Immutable customer reference (survives CCPA deletion)
  customer_reference_id: z.string(), // 'BUY_a8b9c2d1' or 'DLR_f3e4d5c6'
  
  // Payment provider info (generic)
  payment_provider_info: paymentProviderInfoSchema,
  
  payment_timestamp: z.string().datetime(),
});

// Payment creation request
export const createPaymentSchema = z.object({
  buyer_id: z.string().uuid().optional(),
  dealer_id: z.string().uuid().optional(),
  transaction_type: z.enum(['verification', 'subscription']),
  amount_cents: z.number().int().positive(),
  customer_reference_id: z.string(),
  payment_provider_info: paymentProviderInfoSchema,
});

// Payment status update
export const updatePaymentSchema = z.object({
  status: paymentStatusSchema, // Use common payment status enum
  payment_provider_info: paymentProviderInfoSchema,
});

// Customer payment history (survives account deletion)
export const customerPaymentHistorySchema = z.object({
  customer_reference_id: z.string(),
  total_payments: z.number().int(),
  payments: z.array(z.object({
    id: z.string().uuid(),
    transaction_type: z.enum(['verification', 'subscription']),
    amount_cents: z.number().int(),
    status: paymentStatusSchema, // Use common payment status enum
    payment_timestamp: z.string().datetime(),
    account_active: z.boolean(), // false if account was deleted
  }))
});