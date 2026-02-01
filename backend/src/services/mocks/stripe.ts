/**
 * Mock Stripe Service - COMPLETE WITH ALL REQUIRED FUNCTIONS
 * 
 * Includes all functions that service-resolver.ts expects to import
 */

import { randomUUID } from 'crypto';

const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

const mockPaymentIntents = new Map();
const mockSessions = new Map();
const mockCustomers = new Map();
const mockSubscriptions = new Map();

console.log('🧪 Using MOCK Stripe service for development');

// =============================================
// BUYER PAYMENT FUNCTIONS
// =============================================

export const createBuyerCheckoutSession = async (
  buyerEmail: string,
  buyerId: string
) => {
  await mockDelay();
  const sessionId = `cs_mock_${randomUUID().slice(0, 8)}`;
  const paymentIntentId = `pi_mock_${randomUUID().slice(0, 8)}`;
  
  mockPaymentIntents.set(paymentIntentId, {
    id: paymentIntentId,
    status: 'requires_payment_method',
    amount: 200,
    currency: 'usd',
    capture_method: 'manual',
    created: new Date().toISOString(),
    buyer_id: buyerId,
    amount_captured: null,
    captured_at: null,
    canceled_at: null
  });
  
  const session = {
    id: sessionId,
    url: `https://checkout.stripe.com/pay/mock_${sessionId}`,
    payment_intent: paymentIntentId,
    metadata: { buyer_id: buyerId, payment_type: 'verification' },
    mode: 'payment',
    status: 'open'
  };
  
  mockSessions.set(sessionId, session);
  console.log(`✅ Mock Stripe: Created checkout session ${sessionId}`);
  
  return session;
};

export const verifyBuyerPayment = async (sessionId: string) => {
  await mockDelay();
  const session = mockSessions.get(sessionId);
  if (!session) throw new Error(`Payment session not found: ${sessionId}`);
  
  const paymentIntent = mockPaymentIntents.get(session.payment_intent);
  paymentIntent.status = 'succeeded';
  mockSessions.set(sessionId, session);
  
  console.log(`✅ Mock Stripe: Payment authorized for buyer ${session.metadata.buyer_id}`);
  
  return {
    buyerId: session.metadata.buyer_id,
    paymentIntentId: session.payment_intent,
    amountAuthorized: 200,
    status: 'authorized'
  };
};

export const captureBuyerPayment = async (paymentIntentId: string) => {
  await mockDelay();
  const paymentIntent = mockPaymentIntents.get(paymentIntentId);
  if (!paymentIntent) throw new Error(`Payment intent not found: ${paymentIntentId}`);

  // IDEMPOTENCY: If already captured, return existing result
  if (paymentIntent.status === 'captured') {
    console.log(`↩️  Mock Stripe: Payment already captured (idempotent)`);
    return {
      paymentIntentId,
      amount: paymentIntent.amount,
      amountCaptured: paymentIntent.amount_captured,
      status: 'captured',
      capturedAt: paymentIntent.captured_at,
      isIdempotentReturn: true
    };
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Cannot capture payment in status: ${paymentIntent.status}`);
  }

  paymentIntent.status = 'captured';
  paymentIntent.amount_captured = paymentIntent.amount;
  paymentIntent.captured_at = new Date().toISOString();
  mockPaymentIntents.set(paymentIntentId, paymentIntent);

  console.log(`✅ Mock Stripe: CAPTURED payment $${paymentIntent.amount_captured / 100}`);

  return {
    paymentIntentId,
    amount: paymentIntent.amount,
    amountCaptured: paymentIntent.amount_captured,
    status: 'captured',
    capturedAt: paymentIntent.captured_at,
    isIdempotentReturn: false
  };
};

export const refundBuyerPayment = async (paymentIntentId: string) => {
  await mockDelay();
  const paymentIntent = mockPaymentIntents.get(paymentIntentId);
  if (!paymentIntent) throw new Error(`Payment intent not found: ${paymentIntentId}`);

  // IDEMPOTENCY: If already canceled, return existing result
  if (paymentIntent.status === 'canceled') {
    console.log(`↩️  Mock Stripe: Hold already released (idempotent)`);
    return {
      paymentIntentId,
      status: 'canceled',
      canceledAt: paymentIntent.canceled_at,
      message: 'Authorized hold released. No charge made.',
      isIdempotentReturn: true
    };
  }

  if (!['succeeded', 'processing'].includes(paymentIntent.status)) {
    throw new Error(`Cannot refund payment in status: ${paymentIntent.status}`);
  }

  paymentIntent.status = 'canceled';
  paymentIntent.canceled_at = new Date().toISOString();
  paymentIntent.cancellation_reason = 'id_verification_failed';
  mockPaymentIntents.set(paymentIntentId, paymentIntent);

  console.log(`✅ Mock Stripe: RELEASED authorized hold (no charge)`);

  return {
    paymentIntentId,
    status: 'canceled',
    canceledAt: paymentIntent.canceled_at,
    message: 'Authorized hold released. No charge made.',
    isIdempotentReturn: false
  };
};

// =============================================
// DEALER SUBSCRIPTION FUNCTIONS
// =============================================

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
  
  const planLimits = { tier1: 50, tier2: 350, tier3: 3000 };
  
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
  console.log(`✅ Mock Stripe: Created ${plan} subscription checkout`);
  
  return session;
};

export const verifyDealerSubscription = async (sessionId: string) => {
  await mockDelay();
  const session = mockSessions.get(sessionId);
  if (!session || !session.subscription) throw new Error('Subscription session not found');
  
  session.status = 'complete';
  mockSessions.set(sessionId, session);
  
  const subscription = {
    id: session.subscription,
    customer: session.customer,
    status: 'active',
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    metadata: session.metadata
  };
  
  mockSubscriptions.set(session.subscription, subscription);
  console.log(`✅ Mock Stripe: Verified subscription`);
  
  return {
    dealerId: session.metadata.dealer_id,
    stripeCustomerId: session.customer,
    subscriptionId: session.subscription,
    subscriptionStatus: 'active',
    monthlyQueryLimit: parseInt(session.metadata.monthly_query_limit),
    planTier: session.metadata.plan_tier,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
  };
};

export const verifyWebhookSignature = (payload: string, signature: string, secret: string) => {
  try {
    const event = JSON.parse(payload);
    console.log(`✅ Mock Stripe: Webhook signature verified`);
    return event;
  } catch (err) {
    throw new Error('Webhook signature verification failed');
  }
};

export const getDealerSubscriptionDetails = async (subscriptionId: string) => {
  await mockDelay();
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) throw new Error(`Subscription not found: ${subscriptionId}`);
  return subscription;
};

export const getCustomerDetails = async (customerId: string) => {
  await mockDelay();
  const customer = mockCustomers.get(customerId);
  if (!customer) throw new Error(`Customer not found: ${customerId}`);
  return customer;
};

export const getSubscriptionDetails = async (subscriptionId: string) => {
  await mockDelay();
  return await getDealerSubscriptionDetails(subscriptionId);
};

export const cancelDealerSubscription = async (subscriptionId: string) => {
  await mockDelay();
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) throw new Error(`Subscription not found`);
  subscription.status = 'canceled';
  subscription.canceled_at = new Date().toISOString();
  console.log(`✅ Mock Stripe: Canceled subscription`);
  return subscription;
};

export const updateDealerSubscriptionPlan = async (subscriptionId: string, newPlan: string) => {
  await mockDelay();
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) throw new Error(`Subscription not found`);
  subscription.plan = newPlan;
  console.log(`✅ Mock Stripe: Updated subscription plan to ${newPlan}`);
  return subscription;
};

export const resumeDealerSubscription = async (subscriptionId: string) => {
  await mockDelay();
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) throw new Error(`Subscription not found`);
  subscription.status = 'active';
  subscription.resumed_at = new Date().toISOString();
  console.log(`✅ Mock Stripe: Resumed subscription`);
  return subscription;
};

export const updateDealerBillingInfo = async (customerId: string, billingInfo: any) => {
  await mockDelay();
  const customer = mockCustomers.get(customerId);
  if (!customer) throw new Error(`Customer not found`);
  Object.assign(customer, billingInfo);
  console.log(`✅ Mock Stripe: Updated billing info`);
  return customer;
};

export const initStripe = () => {
  console.log('✅ Mock Stripe service initialized');
  return { mock: true };
};