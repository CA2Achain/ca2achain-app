import { z } from 'zod';
import { dealerRegistrationSchema, dealerAccountSchema } from './schema.js';

// Inferred types from schemas
export type DealerRegistration = z.infer<typeof dealerRegistrationSchema>;
export type DealerAccount = z.infer<typeof dealerAccountSchema>;

// Extended types for dealer operations
export interface DealerUsageStats {
  company_name: string;
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
  monthly_query_limit: number;
  queries_used_this_month: number;
  queries_remaining: number;
  billing_period_start: string;
  billing_period_end: string;
  current_period_usage_percentage: number;
}

export interface DealerAPIKeyInfo {
  api_key: string; // Only returned once during generation
  api_key_created_at: string;
  company_name: string;
  message: string;
}

export interface DealerBillingInfo {
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_end: string;
  next_billing_date: string;
  amount_due: number;
}

// For service agreement and legal compliance
export interface DealerComplianceAgreement {
  dealer_id: string;
  agreement_version: string;
  agreed_at: string;
  ip_address: string;
  user_agent: string;
  terms_acknowledged: boolean;
  liability_limitations_accepted: boolean;
}

// Dealer dashboard data
export interface DealerDashboard {
  usage_stats: DealerUsageStats;
  recent_verifications: Array<{
    verification_id: string;
    buyer_email: string; // Masked: "j***@example.com"
    transaction_id: string;
    result: 'verified' | 'failed';
    timestamp: string;
  }>;
  billing_info: DealerBillingInfo;
}