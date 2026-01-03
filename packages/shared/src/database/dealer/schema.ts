import { z } from 'zod';
import { addressSchema, phoneNumberSchema, paymentInfoSchema } from '../../common/schema.js';

// =============================================
// DEALER REGISTRATION & ACCOUNT SCHEMAS
// =============================================

// Dealer registration schema - Basic info only, NO payment/subscription
export const dealerRegistrationSchema = z.object({
  company_name: z.string().min(2),
  business_email: z.string().email().optional(), // Optional - comes from authenticated user
  business_address: addressSchema,
  business_phone: phoneNumberSchema,
});

// Complete dealer account database entity schema
export const dealerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  
  // Basic business information (required at registration)
  company_name: z.string(),
  business_email: z.string(),
  business_address: addressSchema.optional(),
  business_phone: z.string().optional(),
  
  // Immutable reference for audit trail (CCPA compliant)
  dealer_reference_id: z.string(),
  
  // API authentication (NULL until subscription active)
  api_key_hash: z.string().nullable(),
  api_key_created_at: z.string().datetime().optional(),
  
  // SaaS billing system (all NULL until dealer subscribes)
  subscription_tier: z.number().int().min(1).max(3).nullable(),
  subscription_status: z.enum(['active', 'past_due', 'canceled', 'trialing']).nullable(),
  billing_date: z.string().optional(),
  billing_due_date: z.string().optional(),
  
  // Credit system (NULL until subscription active)
  credits_purchased: z.number().int().nullable(),
  additional_credits_purchased: z.number().int().nullable(),
  credits_used: z.number().int().nullable(),
  credits_expire_at: z.string().datetime().optional(),
  
  // Payment method (using common payment structure)
  payment_info: paymentInfoSchema.optional(),
  
  // Activity tracking
  last_logged_in: z.string().datetime().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Dealer profile update schema (for account management)
export const dealerProfileUpdateSchema = z.object({
  company_name: z.string().min(2).optional(),
  business_address: addressSchema.optional(),
  business_phone: phoneNumberSchema.optional(),
});

// Dealer subscription setup schema (for initial subscription activation)
export const dealerSubscriptionSetupSchema = z.object({
  subscription_tier: z.number().int().min(1).max(3),
  payment_method_id: z.string().optional(),
});

// Dealer subscription update schema (for changing existing subscription)
export const dealerSubscriptionUpdateSchema = z.object({
  subscription_tier: z.number().int().min(1).max(3),
});

// Dealer credit purchase schema
export const dealerCreditPurchaseSchema = z.object({
  credit_amount: z.number().int().min(10).max(10000),
  payment_method_id: z.string().optional(),
});

// API key management schema (for future API key operations)
export const dealerApiKeySchema = z.object({
  api_key: z.string().min(32, 'API key must be at least 32 characters'),
});

// =============================================
// RESPONSE SCHEMAS
// =============================================

// Dealer billing summary schema (for dashboard display)
export const dealerBillingSummarySchema = z.object({
  subscription_tier: z.number().int(),
  subscription_status: z.string(),
  credits_available: z.number().int(), // Calculated: (purchased + additional) - used
  credits_used: z.number().int(),
  credits_expire_at: z.string().datetime(),
  next_billing_date: z.string().optional(),
  payment_method: z.object({
    method: z.string(),
    last4: z.string().optional(),
    brand: z.string().optional(),
  }).optional(),
});