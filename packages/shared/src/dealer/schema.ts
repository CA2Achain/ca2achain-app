import { z } from 'zod';
import { addressStringSchema, phoneNumberSchema, paymentInfoSchema } from '../common/schema.js';

// =============================================
// DEALER REGISTRATION & ACCOUNT SCHEMAS
// =============================================

// Dealer registration schema (for initial account creation)
export const dealerRegistrationSchema = z.object({
  company_name: z.string().min(2),
  business_email: z.string().email(),
  business_address: addressStringSchema, // Use common address schema
  business_phone: phoneNumberSchema, // Use common phone validation
  subscription_tier: z.number().int().min(1).max(3).default(1), // Tier 1, 2, or 3
});

// Complete dealer account database entity schema
export const dealerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  
  // Business information
  company_name: z.string(),
  business_email: z.string(), // company@business.com format required
  business_address: z.string().optional(),
  business_phone: z.string().optional(),
  
  // API authentication
  api_key_hash: z.string(),
  api_key_created_at: z.string().datetime(),
  
  // SaaS billing system
  subscription_tier: z.number().int().min(1).max(3).default(1), // 1, 2, or 3
  subscription_status: z.enum(['active', 'past_due', 'canceled', 'trialing']).default('trialing'),
  billing_date: z.string().optional(), // YYYY-MM-DD format
  billing_due_date: z.string().optional(), // YYYY-MM-DD format
  
  // Credit system (base + add-ons)
  credits_purchased: z.number().int().default(100), // Base subscription credits
  additional_credits_purchased: z.number().int().default(0), // Bulk add-ons
  credits_used: z.number().int().default(0),
  credits_expire_at: z.string().datetime().optional(),
  
  // Payment method (using common payment structure)
  payment_info: paymentInfoSchema,
  
  // Activity tracking
  last_logged_in: z.string().datetime().optional(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// =============================================
// UPDATE & MANAGEMENT SCHEMAS
// =============================================

// Profile update schema
export const dealerProfileUpdateSchema = z.object({
  company_name: z.string().min(1).optional(),
  business_email: z.string().email().optional(),
  business_address: z.string().min(10).optional(),
  business_phone: phoneNumberSchema.optional(),
  subscription_tier: z.number().int().min(1).max(3).optional(),
  payment_info: paymentInfoSchema,
});

// Subscription management schema
export const dealerSubscriptionUpdateSchema = z.object({
  subscription_tier: z.number().int().min(1).max(3),
  payment_info: paymentInfoSchema,
});

// Bulk credit purchase schema
export const dealerCreditPurchaseSchema = z.object({
  credit_amount: z.number().int().min(1).max(10000), // 1 to 10,000 credits
  payment_info: paymentInfoSchema,
});

// API key management schema
export const dealerApiKeySchema = z.object({
  api_key: z.string().min(32, 'API key must be at least 32 characters'),
});

// =============================================
// RESPONSE SCHEMAS
// =============================================

// Dealer billing summary schema
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