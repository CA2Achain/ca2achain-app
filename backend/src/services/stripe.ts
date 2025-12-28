import Stripe from 'stripe';

let stripe: Stripe;

export const initStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripe;
};

export const getStripe = () => {
  if (!stripe) {
    throw new Error('Stripe not initialized. Call initStripe() first.');
  }
  return stripe;
};

// =============================================
// BUYER PAYMENT (One-time $2 verification fee)
// =============================================

// Create checkout session for buyer verification payment
export const createBuyerCheckoutSession = async (
  buyerEmail: string,
  buyerId: string
): Promise<Stripe.Checkout.Session> => {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Identity Verification Service',
            description: 'One-time identity verification for CA2AChain',
          },
          unit_amount: 200, // $2.00 in cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/buyer/verification-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/buyer/payment-cancelled`,
    customer_email: buyerEmail,
    metadata: {
      buyer_id: buyerId,
      payment_type: 'verification',
    },
  });

  return session;
};

// Verify buyer payment session
export const verifyBuyerPayment = async (sessionId: string) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed');
  }
  
  return {
    buyerId: session.metadata?.buyer_id,
    paymentIntentId: session.payment_intent as string,
    amountPaid: session.amount_total, // Should be 200 cents ($2.00)
  };
};

// =============================================
// DEALER SUBSCRIPTIONS 
// =============================================

// Create Stripe customer for dealer
export const createDealerCustomer = async (
  email: string, 
  companyName: string
): Promise<Stripe.Customer> => {
  const customer = await getStripe().customers.create({
    email,
    name: companyName,
    metadata: {
      account_type: 'dealer',
    },
  });

  return customer;
};

// Create dealer subscription checkout
export const createDealerSubscriptionCheckout = async (
  dealerEmail: string,
  companyName: string,
  dealerId: string,
  plan: 'tier1' | 'tier2' | 'tier3'
): Promise<Stripe.Checkout.Session> => {
  // Define subscription tiers
  const plans = {
    tier1: { priceId: process.env.STRIPE_TIER1_PRICE_ID!, queryLimit: 100, name: 'Starter Plan' },
    tier2: { priceId: process.env.STRIPE_TIER2_PRICE_ID!, queryLimit: 1000, name: 'Business Plan' },
    tier3: { priceId: process.env.STRIPE_TIER3_PRICE_ID!, queryLimit: 10000, name: 'Enterprise Plan' },
  };

  const selectedPlan = plans[plan];

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: selectedPlan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/dealer/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/dealer/subscription-cancelled`,
    customer_email: dealerEmail,
    metadata: {
      dealer_id: dealerId,
      monthly_query_limit: selectedPlan.queryLimit.toString(),
      plan_tier: plan,
    },
  });

  return session;
};

// Verify dealer subscription
export const verifyDealerSubscription = async (sessionId: string) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });
  
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed');
  }
  
  const subscription = session.subscription as Stripe.Subscription;
  
  return {
    dealerId: session.metadata?.dealer_id,
    stripeCustomerId: session.customer as string,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    monthlyQueryLimit: parseInt(session.metadata?.monthly_query_limit || '100'),
    planTier: session.metadata?.plan_tier,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };
};

// Update dealer subscription
export const updateDealerSubscription = async (
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> => {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  
  const updatedSubscription = await getStripe().subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });

  return updatedSubscription;
};

// Cancel dealer subscription
export const cancelDealerSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  const subscription = await getStripe().subscriptions.cancel(subscriptionId);
  return subscription;
};

// =============================================
// WEBHOOK HANDLING
// =============================================

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
};

// Get subscription details
export const getSubscriptionDetails = async (subscriptionId: string) => {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  return subscription;
};

// Get customer details
export const getCustomerDetails = async (customerId: string) => {
  const customer = await getStripe().customers.retrieve(customerId);
  return customer;
};