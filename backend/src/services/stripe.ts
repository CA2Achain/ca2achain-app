/**
 * Mock Stripe Service for Development
 * Use this when you don't have Stripe API keys yet
 */

import { randomUUID } from 'crypto';

// Mock delay to simulate network requests
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🧪 Using MOCK Stripe service for development');

// In-memory storage for mock data
const mockCustomers = new Map();
const mockSessions = new Map();
const mockSubscriptions = new Map();

// =============================================
// BUYER PAYMENT FUNCTIONS (One-time $2 fee)
// =============================================

export const createBuyerCheckoutSession = async (
  buyerEmail: string,
  buyerId: string
) => {
  await mockDelay();
  
  const sessionId = `cs_mock_${randomUUID().slice(0, 8)}`;
  const paymentIntentId = `pi_mock_${randomUUID().slice(0, 8)}`;
  
  const session = {
    id: sessionId,
    url: `https://checkout.stripe.com/pay/mock_${sessionId}`,
    payment_intent: paymentIntentId,
    metadata: {
      buyer_id: buyerId,
      payment_type: 'verification'
    },
    mode: 'payment',
    status: 'open'
  };
  
  mockSessions.set(sessionId, session);
  
  console.log(`🧪 Mock Stripe: Created buyer checkout session for ${buyerEmail}`);
  return session;
};

export const verifyBuyerPayment = async (sessionId: string) => {
  await mockDelay();
  
  const session = mockSessions.get(sessionId);
  if (!session) {
    throw new Error('Mock payment session not found');
  }
  
  // Mark as completed
  session.status = 'complete';
  mockSessions.set(sessionId, session);
  
  const result = {
    buyerId: session.metadata.buyer_id,
    paymentIntentId: session.payment_intent,
    amountPaid: 3900, // $39.00 in cents
  };
  
  console.log(`🧪 Mock Stripe: Verified buyer payment for buyer ${result.buyerId}`);
  return result;
};

// =============================================
// DEALER SUBSCRIPTION FUNCTIONS
// =============================================

export const createDealerCustomer = async (
  email: string,
  companyName: string
) => {
  await mockDelay();
  
  const customerId = `cus_mock_${randomUUID().slice(0, 8)}`;
  const customer = {
    id: customerId,
    email,
    metadata: {
      account_type: 'dealer',
      company_name: companyName
    },
    created: Math.floor(Date.now() / 1000)
  };
  
  mockCustomers.set(customerId, customer);
  
  console.log(`🧪 Mock Stripe: Created dealer customer for ${companyName}`);
  return customer;
};

export const createDealerSubscriptionCheckout = async (
  dealerEmail: string,
  companyName: string,
  dealerId: string,
  plan: 'tier1' | 'tier2' | 'tier3'
) => {
  await mockDelay();
  
  const sessionId = `cs_mock_${randomUUID().slice(0, 8)}`;
  const subscriptionId = `sub_mock_${randomUUID().slice(0, 8)}`;
  const customerId = `cus_mock_${randomUUID().slice(0, 8)}`;
  
  const planLimits = {
    tier1: 50,    // Starter: $199/month for 50 verifications
    tier2: 350,   // Business: $999/month for 350 verifications  
    tier3: 3000   // Enterprise: $3799/month for 3000 verifications
  };
  
  const session = {
    id: sessionId,
    url: `https://checkout.stripe.com/pay/mock_${sessionId}`,
    customer: customerId,
    subscription: subscriptionId,
    metadata: {
      dealer_id: dealerId,
      monthly_query_limit: planLimits[plan].toString(),
      plan_tier: plan
    },
    mode: 'subscription',
    status: 'open'
  };
  
  mockSessions.set(sessionId, session);
  
  console.log(`🧪 Mock Stripe: Created ${plan} subscription checkout for ${companyName}`);
  return session;
};

export const verifyDealerSubscription = async (sessionId: string) => {
  await mockDelay();
  
  const session = mockSessions.get(sessionId);
  if (!session || !session.subscription) {
    throw new Error('Mock subscription session not found');
  }
  
  // Mark as completed
  session.status = 'complete';
  mockSessions.set(sessionId, session);
  
  // Create mock subscription
  const subscription = {
    id: session.subscription,
    customer: session.customer,
    status: 'active',
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    metadata: session.metadata
  };
  
  mockSubscriptions.set(session.subscription, subscription);
  
  const result = {
    dealerId: session.metadata.dealer_id,
    stripeCustomerId: session.customer,
    subscriptionId: session.subscription,
    subscriptionStatus: 'active',
    monthlyQueryLimit: parseInt(session.metadata.monthly_query_limit),
    planTier: session.metadata.plan_tier,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
  };
  
  console.log(`🧪 Mock Stripe: Verified ${result.planTier} subscription for dealer ${result.dealerId}`);
  return result;
};

// =============================================
// WEBHOOK SUPPORT
// =============================================

export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): any => {
  // Mock webhook event - just parse the payload
  try {
    const event = JSON.parse(payload);
    console.log(`🧪 Mock Stripe: Webhook event ${event.type}`);
    return event;
  } catch (err) {
    throw new Error('Mock webhook signature verification failed');
  }
};

export const getSubscriptionDetails = async (subscriptionId: string) => {
  await mockDelay();
  
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) {
    throw new Error('Mock subscription not found');
  }
  
  return subscription;
};

export const getCustomerDetails = async (customerId: string) => {
  await mockDelay();
  
  const customer = mockCustomers.get(customerId);
  if (!customer) {
    throw new Error('Mock customer not found');
  }
  
  return customer;
};

// =============================================
// INITIALIZATION
// =============================================

export const initStripe = () => {
  console.log('🧪 Mock Stripe service initialized');
  console.log('💡 To use real Stripe, set STRIPE_SECRET_KEY in .env and restart');
  return { mock: true };
};