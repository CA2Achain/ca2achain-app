import { z } from 'zod';
import {
  dealerRegistrationSchema,
  dealerAccountSchema,
  dealerSubscriptionSetupSchema,
  dealerSubscriptionUpdateSchema,
  dealerProfileUpdateSchema,
  dealerCreditPurchaseSchema,
  dealerApiKeySchema,
  dealerBillingSummarySchema
} from './schema.js';

// Inferred types from Zod schemas
export type DealerRegistration = z.infer<typeof dealerRegistrationSchema>;
export type DealerAccount = z.infer<typeof dealerAccountSchema>;
export type DealerSubscriptionSetup = z.infer<typeof dealerSubscriptionSetupSchema>;
export type DealerSubscriptionUpdate = z.infer<typeof dealerSubscriptionUpdateSchema>;
export type DealerProfileUpdate = z.infer<typeof dealerProfileUpdateSchema>;
export type DealerCreditPurchase = z.infer<typeof dealerCreditPurchaseSchema>;
export type DealerApiKey = z.infer<typeof dealerApiKeySchema>;
export type DealerBillingSummary = z.infer<typeof dealerBillingSummarySchema>;

// Subscription status enum
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

// Subscription tier type
export type SubscriptionTier = 1 | 2 | 3;

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

// Updated usage response for credit system
export interface DealerUsageResponse {
  success: boolean;
  usage: {
    credits_available: number; // (purchased + additional) - used
    credits_purchased: number;
    additional_credits_purchased: number;
    credits_used: number;
    credits_expire_at: string;
    subscription_tier: SubscriptionTier;
  };
}

// Credit purchase response
export interface DealerCreditPurchaseResponse {
  success: boolean;
  credits_added?: number;
  new_balance?: number;
  error?: string;
}