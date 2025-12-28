import { z } from 'zod';

export const dealerRegistrationSchema = z.object({
  company_name: z.string().min(2),
  email: z.string().email(),
  monthly_query_limit: z.number().int().min(100).max(100000),
});

export const dealerAccountSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  company_name: z.string(),
  
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