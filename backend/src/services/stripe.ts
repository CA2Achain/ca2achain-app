/**
 * Stripe Service - Safe Payment Capture Flow Implementation
 * 
 * Flow: authorize (manual capture) → ID check → capture only if ID passes
 * 
 * Key Principle: Funds are held but not charged until ID verification passes
 * This prevents payment loss if ID verification fails
 */

import { randomUUID } from 'crypto';

const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🧪 Using MOCK Stripe service for development');
console.log('💡 Safe Capture Flow: authorize → ID check → capture only if ID passes');

const mockPaymentIntents = new Map();
const mockCustomers = new Map();
const mockSessions = new Map();
const mockSubscriptions = new Map();

// =============================================
// BUYER PAYMENT - SAFE CAPTURE FLOW
// =============================================

/**
 * Create buyer checkout session with MANUAL CAPTURE mode
 * 
 * capture_method: 'manual' = authorize funds but do NOT auto-charge
 * Funds are held on card until we explicitly call capture() after ID passes
 * 
 * Payment Status: pending → authorized
 */
export const createBuyerCheckoutSession = async (
  buyerEmail: string,
  buyerId: string
) => {
  await mockDelay();
  
  const sessionId = `cs_mock_${randomUUID().slice(0, 8)}`;
  const paymentIntentId = `pi_mock_${randomUUID().slice(0, 8)}`;
  
  // Store payment intent for later capture or refund
  mockPaymentIntents.set(paymentIntentId, {
    id: paymentIntentId,
    status: 'requires_payment_method', // Awaiting payment method
    amount: 200, // $2.00 in cents
    currency: 'usd',
    capture_method: 'manual', // CRITICAL: Will NOT auto-charge
    created: new Date().toISOString(),
    buyer_id: buyerId,
    amount_captured: null,
    captured_at: null
  });
  
  const session = {
    id: sessionId,
    url: `https://checkout.stripe.com/pay/mock_${sessionId}`,
    payment_intent: paymentIntentId,
    metadata: {
      buyer_id: buyerId,
      payment_type: 'verification',
      capture_method: 'manual'
    },
    mode: 'payment',
    status: 'open'
  };
  
  mockSessions.set(sessionId, session);
  
  console.log(`🧪 Mock Stripe: Created buyer checkout with manual capture for ${buyerEmail}`);
  console.log(`   Payment Intent: ${paymentIntentId} (capture_method: manual)`);
  console.log(`   Amount: $${200 / 100} held (not yet charged)`);
  return session;
};

/**
 * Verify buyer payment (payment method added)
 * 
 * After this: payment intent status = 'succeeded' (authorized, ready to capture)
 * Funds are held on card but NOT charged yet
 * 
 * Payment Status: authorized
 */
export const verifyBuyerPayment = async (sessionId: string) => {
  await mockDelay();
  
  const session = mockSessions.get(sessionId);
  if (!session) {
    throw new Error('Mock payment session not found');
  }
  
  const paymentIntent = mockPaymentIntents.get(session.payment_intent);
  if (!paymentIntent) {
    throw new Error('Mock payment intent not found');
  }
  
  // Mark payment method as confirmed, funds authorized
  paymentIntent.status = 'succeeded'; // Authorized (held), ready to capture
  paymentIntent.client_secret = `secret_${randomUUID()}`;
  mockPaymentIntents.set(session.payment_intent, paymentIntent);
  
  session.status = 'complete';
  mockSessions.set(sessionId, session);
  
  const result = {
    buyerId: session.metadata.buyer_id,
    paymentIntentId: session.payment_intent,
    amountAuthorized: 200, // $2.00 - funds HELD
    captureMethod: 'manual',
    nextStep: 'Start ID verification. Funds will be captured only if ID passes.'
  };
  
  console.log(`🧪 Mock Stripe: Payment authorized for buyer ${result.buyerId}`);
  console.log(`   Amount held: $${result.amountAuthorized / 100} (not yet charged)`);
  return result;
};

/**
 * CAPTURE buyer payment (charge the card)
 * 
 * ONLY called after ID verification passes
 * Moves payment from 'authorized' to 'captured'
 * This is when the card is actually charged
 * 
 * Payment Status: id_check_passed → completed
 */
export const captureBuyerPayment = async (paymentIntentId: string) => {
  await mockDelay();
  
  const paymentIntent = mockPaymentIntents.get(paymentIntentId);
  if (!paymentIntent) {
    throw new Error('Payment intent not found');
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Cannot capture payment in status: ${paymentIntent.status}`);
  }

  // Capture the authorized funds (charge the card)
  paymentIntent.status = 'captured';
  paymentIntent.amount_captured = paymentIntent.amount;
  paymentIntent.captured_at = new Date().toISOString();
  mockPaymentIntents.set(paymentIntentId, paymentIntent);

  const result = {
    paymentIntentId: paymentIntentId,
    amount: paymentIntent.amount,
    amountCaptured: paymentIntent.amount_captured,
    status: 'captured',
    capturedAt: paymentIntent.captured_at,
    message: 'Funds charged'
  };

  console.log(`🧪 Mock Stripe: CAPTURED payment ${paymentIntentId}`);
  console.log(`   Amount CHARGED: $${result.amount / 100}`);
  return result;
};

/**
 * REFUND authorized hold (release without charging)
 * 
 * Called if ID verification FAILS before capture
 * No actual refund needed - funds were never charged, just held
 * Stripe simply cancels the authorization
 * 
 * Payment Status: id_check_started → authorized_refunded
 */
export const refundBuyerPayment = async (paymentIntentId: string) => {
  await mockDelay();
  
  const paymentIntent = mockPaymentIntents.get(paymentIntentId);
  if (!paymentIntent) {
    throw new Error('Payment intent not found');
  }

  if (!['succeeded', 'processing'].includes(paymentIntent.status)) {
    throw new Error(`Cannot refund payment in status: ${paymentIntent.status}`);
  }

  // Cancel the payment intent (release the authorized hold)
  paymentIntent.status = 'canceled';
  paymentIntent.canceled_at = new Date().toISOString();
  paymentIntent.cancellation_reason = 'id_verification_failed';
  mockPaymentIntents.set(paymentIntentId, paymentIntent);

  const result = {
    paymentIntentId: paymentIntentId,
    status: 'canceled',
    canceledAt: paymentIntent.canceled_at,
    message: 'Authorized hold released. No charge made.',
    amount: 0 // No charge made
  };

  console.log(`🧪 Mock Stripe: RELEASED authorized hold ${paymentIntentId}`);
  console.log(`   No funds charged - hold is released`);
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
// WEBHOOK & UTILITY FUNCTIONS
// =============================================

export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): any => {
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

export const getDealerSubscriptionDetails = async (subscriptionId: string) => {
  await mockDelay();
  
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) {
    throw new Error('Mock subscription not found');
  }
  
  console.log(`🧪 Mock Stripe: Retrieved subscription details for ${subscriptionId}`);
  return subscription;
};

export const cancelDealerSubscription = async (subscriptionId: string) => {
  await mockDelay();
  
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) {
    throw new Error('Mock subscription not found');
  }
  
  subscription.status = 'canceled';
  subscription.canceledAt = new Date();
  subscription.cancelAtPeriodEnd = true;
  
  mockSubscriptions.set(subscriptionId, subscription);
  
  console.log(`🧪 Mock Stripe: Cancelled subscription ${subscriptionId}`);
  return subscription;
};

export const updateDealerSubscriptionPlan = async (
  subscriptionId: string, 
  newPlan: 'tier1' | 'tier2' | 'tier3'
) => {
  await mockDelay();
  
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) {
    throw new Error('Mock subscription not found');
  }
  
  const planLimits = {
    tier1: 50,
    tier2: 350,
    tier3: 3000
  };
  
  const planPrices = {
    tier1: 19900,
    tier2: 99900,
    tier3: 379900
  };
  
  subscription.planTier = newPlan;
  subscription.monthlyQueryLimit = planLimits[newPlan];
  subscription.amount = planPrices[newPlan];
  subscription.updatedAt = new Date();
  
  mockSubscriptions.set(subscriptionId, subscription);
  
  console.log(`🧪 Mock Stripe: Updated subscription ${subscriptionId} to plan ${newPlan}`);
  return subscription;
};

export const resumeDealerSubscription = async (subscriptionId: string) => {
  await mockDelay();
  
  const subscription = mockSubscriptions.get(subscriptionId);
  if (!subscription) {
    throw new Error('Mock subscription not found');
  }
  
  subscription.status = 'active';
  subscription.canceledAt = null;
  subscription.cancelAtPeriodEnd = false;
  
  mockSubscriptions.set(subscriptionId, subscription);
  
  console.log(`🧪 Mock Stripe: Resumed subscription ${subscriptionId}`);
  return subscription;
};

export const updateDealerBillingInfo = async (customerId: string, billingData: any) => {
  await mockDelay();
  
  const customer = mockCustomers.get(customerId);
  if (!customer) {
    throw new Error('Mock customer not found');
  }
  
  customer.billingDetails = {
    ...customer.billingDetails,
    ...billingData,
    updatedAt: new Date().toISOString()
  };
  
  mockCustomers.set(customerId, customer);
  
  console.log(`🧪 Mock Stripe: Updated billing info for customer ${customerId}`);
  return customer;
};

export const initStripe = () => {
  console.log('🧪 Mock Stripe service initialized');
  console.log('💡 Safe Capture Flow: authorize → ID check → capture only if ID passes');
  console.log('💡 To use real Stripe, set STRIPE_SECRET_KEY in .env and restart');
  return { mock: true };
};