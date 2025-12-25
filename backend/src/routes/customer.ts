import { FastifyInstance } from 'fastify';
import { customerRegistrationSchema } from '@ca2achain/shared';
import { createCustomer, getCustomerById } from '../services/supabase.js';
import { generateApiKey, hashApiKey } from '../services/encryption.js';
import { createStripeCustomer, createSubscription } from '../services/stripe.js';
import { sendApiKey } from '../services/email.js';

export default async function customerRoutes(fastify: FastifyInstance) {
  // Register new customer
  fastify.post('/register', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = customerRegistrationSchema.parse(request.body);
      const userEmail = request.user!.email;

      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer(data.email, data.company_name);

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Create customer record
      const customer = await createCustomer({
        company_name: data.company_name,
        email: data.email,
        privy_did: request.user!.id,
        api_key_hash: apiKeyHash,
        stripe_customer_id: stripeCustomer.id,
        subscription_status: 'trialing',
        monthly_query_limit: data.monthly_query_limit,
        queries_used_this_month: 0,
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Send API key via email
      await sendApiKey(data.email, apiKey, data.company_name);

      return reply.send({
        customer_id: customer.id,
        company_name: customer.company_name,
        api_key: apiKey, // Only shown once
        message: 'API key sent to your email. Store it securely.',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to register customer' });
    }
  });

  // Get customer usage stats
  fastify.get('/usage', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Find customer by authenticated user
      const customer = await getCustomerById(request.user!.id);
      
      if (!customer) {
        return reply.status(404).send({ error: 'Customer not found' });
      }

      return reply.send({
        company_name: customer.company_name,
        subscription_status: customer.subscription_status,
        monthly_query_limit: customer.monthly_query_limit,
        queries_used_this_month: customer.queries_used_this_month,
        queries_remaining: customer.monthly_query_limit - customer.queries_used_this_month,
        billing_period_start: customer.billing_period_start,
        billing_period_end: customer.billing_period_end,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to get usage stats' });
    }
  });

  // Create Stripe checkout session for subscription
  fastify.post('/subscribe', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { price_id } = request.body as { price_id: string };
      
      const customer = await getCustomerById(request.user!.id);
      
      if (!customer) {
        return reply.status(404).send({ error: 'Customer not found' });
      }

      // Create subscription
      const subscription = await createSubscription(
        customer.stripe_customer_id,
        price_id,
        customer.monthly_query_limit
      );

      return reply.send({
        subscription_id: subscription.id,
        status: subscription.status,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to create subscription' });
    }
  });

  // Regenerate API key
  fastify.post('/regenerate-key', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const customer = await getCustomerById(request.user!.id);
      
      if (!customer) {
        return reply.status(404).send({ error: 'Customer not found' });
      }

      // Generate new API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Update customer with new API key hash
      // TODO: Add updateCustomer function to supabase service

      // Send new API key via email
      await sendApiKey(customer.email, apiKey, customer.company_name);

      return reply.send({
        api_key: apiKey,
        message: 'New API key generated and sent to your email',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to regenerate API key' });
    }
  });
}