export interface Customer {
  id: string;
  company_name: string;
  email: string;
  privy_did?: string;
  api_key_hash: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
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