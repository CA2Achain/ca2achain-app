import { z } from 'zod';

// Payment record schema with immutable customer reference
export const paymentSchema = z.object({
  id: z.string().uuid(),
  
  // Your core columns
  account_id: z.string().uuid().nullable(), // NULL after CCPA deletion
  transaction_type: z.enum(['verification', 'subscription']),
  amount_cents: z.number().int().positive(),
  payment_timestamp: z.string().datetime(),
  
  // Immutable customer reference (survives account deletion)
  customer_reference_id: z.string(), // 'BUY_a8b9c2d1' or 'DLR_f3e4d5c6'
  
  // Essential business fields
  stripe_payment_intent_id: z.string(),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']),
  
  created_at: z.string().datetime(),
});

// Payment history response
export const paymentHistorySchema = z.object({
  account_type: z.enum(['buyer', 'dealer']),
  payments: z.array(z.object({
    id: z.string().uuid(),
    customer_reference_id: z.string(),
    transaction_type: z.enum(['verification', 'subscription']),
    amount_cents: z.number().int(),
    status: z.enum(['pending', 'succeeded', 'failed', 'refunded']),
    payment_timestamp: z.string().datetime(),
    created_at: z.string().datetime(),
  }))
});

// Transaction type summary
export const transactionTypeSummarySchema = z.object({
  transaction_type: z.enum(['verification', 'subscription']),
  total_payments: z.number().int(),
  total_revenue_cents: z.number().int(),
  payments: z.array(z.object({
    id: z.string().uuid(),
    customer_reference_id: z.string(),
    amount_cents: z.number().int(),
    status: z.enum(['pending', 'succeeded', 'failed', 'refunded']),
    payment_timestamp: z.string().datetime(),
  }))
});

// Customer payment history (survives account deletion)
export const customerPaymentHistorySchema = z.object({
  customer_reference_id: z.string(),
  total_payments: z.number().int(),
  payments: z.array(z.object({
    id: z.string().uuid(),
    transaction_type: z.enum(['verification', 'subscription']),
    amount_cents: z.number().int(),
    status: z.enum(['pending', 'succeeded', 'failed', 'refunded']),
    payment_timestamp: z.string().datetime(),
    account_active: z.boolean(), // false if account was deleted
  }))
});