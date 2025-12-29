import { z } from 'zod';

// Dealer registration schema (for initial account creation)
export const dealerRegistrationSchema = z.object({
  company_name: z.string().min(2),
  business_address: z.string().min(10, 'Complete business address required'),
  business_phone: z.string().min(10, 'Valid business phone required'),
  contact_name: z.string().min(1, 'Contact name is required'),
  federal_firearms_license: z.string().optional(), // FFL is optional for accessory dealers
  email: z.string().email(),
});

// Complete dealer account database entity schema
export const dealerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  company_name: z.string(),
  business_address: z.string().optional(),
  business_phone: z.string().optional(),
  contact_name: z.string().optional(),
  federal_firearms_license: z.string().optional(),
  
  // Simple API authentication
  api_key_hash: z.string(),
  api_key_created_at: z.string().datetime(),
  
  // Stripe billing
  stripe_customer_id: z.string(),
  stripe_subscription_id: z.string().optional(),
  subscription_status: z.enum(['active', 'past_due', 'canceled', 'trialing']),
  monthly_query_limit: z.number().int(),
  queries_used_this_month: z.number().int().default(0),
  billing_period_start: z.string().datetime(),
  billing_period_end: z.string().datetime(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Subscription plan schema
export const dealerSubscriptionSchema = z.object({
  plan: z.enum(['tier1', 'tier2', 'tier3'], {
    errorMap: () => ({ message: 'Plan must be tier1 (Starter), tier2 (Business), or tier3 (Enterprise)' })
  })
});

// Profile update schema
export const dealerProfileUpdateSchema = z.object({
  company_name: z.string().min(1).optional(),
  business_address: z.string().min(10).optional(),
  business_phone: z.string().min(10).optional(),
  contact_name: z.string().min(1).optional(),
  federal_firearms_license: z.string().optional(),
});

// API key schema
export const dealerApiKeySchema = z.object({
  api_key: z.string().min(32, 'API key must be at least 32 characters'),
});

// Type exports
export type DealerRegistration = z.infer<typeof dealerRegistrationSchema>;
export type DealerAccount = z.infer<typeof dealerAccountSchema>;
export type DealerSubscription = z.infer<typeof dealerSubscriptionSchema>;
export type DealerProfileUpdate = z.infer<typeof dealerProfileUpdateSchema>;
export type DealerApiKey = z.infer<typeof dealerApiKeySchema>;