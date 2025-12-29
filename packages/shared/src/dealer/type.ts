import { z } from 'zod';
import {
  dealerRegistrationSchema,
  dealerAccountSchema,
  dealerSubscriptionSchema,
  dealerProfileUpdateSchema,
  dealerApiKeySchema
} from './schema.js';

// Inferred types from Zod schemas
export type DealerRegistration = z.infer<typeof dealerRegistrationSchema>;
export type DealerAccount = z.infer<typeof dealerAccountSchema>;
export type DealerSubscription = z.infer<typeof dealerSubscriptionSchema>;
export type DealerProfileUpdate = z.infer<typeof dealerProfileUpdateSchema>;
export type DealerApiKey = z.infer<typeof dealerApiKeySchema>;

// Subscription status enum
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

// API response types
export interface DealerRegistrationResponse {
  success: boolean;
  dealer_id?: string;
  api_key?: string;
  subscription_required?: boolean;
  error?: string;
}

export interface DealerProfileResponse {
  success: boolean;
  dealer: DealerAccount;
}

export interface DealerUsageResponse {
  success: boolean;
  usage: {
    queries_used: number;
    monthly_limit: number;
    queries_remaining: number;
    billing_period_start: string;
    billing_period_end: string;
  };
}

// Legacy interface for backward compatibility
export interface Customer {
  id: string;
  company_name: string;
  email: string;
  privy_did?: string;
  api_key_hash: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  subscription_status: SubscriptionStatus;
  monthly_query_limit: number;
  queries_used_this_month: number;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerUsage {
  customer_id: string;
  period_start: string;
  period_end: string;
  queries_used: number;
  queries_limit: number;
  queries_remaining: number;
}