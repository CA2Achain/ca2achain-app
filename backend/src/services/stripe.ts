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

// Create customer for subscription
export const createStripeCustomer = async (email: string, name: string) => {
  const customer = await getStripe().customers.create({
    email,
    name,
  });

  return customer;
};

// Create subscription
export const createSubscription = async (
  customerId: string,
  priceId: string,
  queryLimit: number
) => {
  const subscription = await getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: {
      monthly_query_limit: queryLimit.toString(),
    },
  });

  return subscription;
};

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
};