import { FastifyInstance } from 'fastify';
import { dealerRegistrationSchema } from '@ca2achain/shared';
import { 
  createDealerAccount, 
  getDealerByAuthId, 
  getDealerById,
  updateDealerAccount,
  incrementDealerQueryCount
} from '../services/supabase.js';
import { generateApiKey, hashApiKey } from '../services/encryption.js';
import { 
  createDealerCustomer, 
  createDealerSubscriptionCheckout,
  verifyDealerSubscription 
} from '../services/service-resolver.js';
import { 
  sendDealerApiKey, 
  sendDealerSubscriptionConfirmed,
  sendDealerUsageSummary 
} from '../services/email.js';

export default async function dealerRoutes(fastify: FastifyInstance) {
  
  // Create dealer account (after auth)
  fastify.post('/register', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = dealerRegistrationSchema.parse(request.body);
      const authAccount = request.user!;
      
      if (authAccount.account_type !== 'dealer') {
        return reply.status(403).send({ 
          success: false,
          error: 'Only dealer accounts can access this endpoint' 
        });
      }

      // Check if dealer account already exists
      let dealer = await getDealerByAuthId(authAccount.id);
      
      if (dealer) {
        return reply.status(409).send({
          success: false,
          error: 'Dealer account already exists',
          dealer_id: dealer.id,
        });
      }

      // Create Stripe customer
      const stripeCustomer = await createDealerCustomer(
        authAccount.email, 
        data.company_name
      );

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Create dealer record
      dealer = await createDealerAccount({
        auth_id: authAccount.id,
        company_name: data.company_name,
        api_key_hash: apiKeyHash,
        stripe_customer_id: stripeCustomer.id,
        subscription_status: 'trialing',
        monthly_query_limit: data.monthly_query_limit,
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Send API key via email
      await sendDealerApiKey(authAccount.email, apiKey, data.company_name);

      return reply.send({
        success: true,
        dealer_id: dealer.id,
        company_name: dealer.company_name,
        api_key: apiKey, // Only shown once
        message: 'API key sent to your email. Store it securely.',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to register dealer' 
      });
    }
  });

  // Create subscription checkout session
  fastify.post('/subscription', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { plan } = request.body as { plan: 'tier1' | 'tier2' | 'tier3' };
      const authAccount = request.user!;
      
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      // Create subscription checkout session
      const session = await createDealerSubscriptionCheckout(
        authAccount.email,
        dealer.company_name,
        dealer.id,
        plan
      );

      return reply.send({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to create subscription session' 
      });
    }
  });

  // Verify subscription payment
  fastify.post('/subscription/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { session_id } = request.body as { session_id: string };
      const authAccount = request.user!;

      // Verify subscription with Stripe
      const subscription = await verifyDealerSubscription(session_id);
      
      // Update dealer subscription status
      if (!subscription.dealerId) {
        throw new Error('Subscription verification failed: missing dealer ID');
      }
      
      const dealer = await updateDealerAccount(subscription.dealerId, {
        stripe_subscription_id: subscription.subscriptionId,
        subscription_status: subscription.subscriptionStatus as any,
        monthly_query_limit: subscription.monthlyQueryLimit,
        billing_period_start: subscription.currentPeriodStart.toISOString(),
        billing_period_end: subscription.currentPeriodEnd.toISOString(),
      });

      // Send confirmation email
      await sendDealerSubscriptionConfirmed(
        authAccount.email,
        dealer.company_name,
        subscription.planTier || 'Business',
        subscription.monthlyQueryLimit
      );

      return reply.send({
        success: true,
        message: 'Subscription verified and activated',
        subscription_status: dealer.subscription_status,
        monthly_query_limit: dealer.monthly_query_limit,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to verify subscription' 
      });
    }
  });

  // Get dealer dashboard data
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      // Calculate usage percentage
      const usagePercentage = Math.round(
        (dealer.queries_used_this_month / dealer.monthly_query_limit) * 100
      );

      return reply.send({
        success: true,
        dealer: {
          id: dealer.id,
          company_name: dealer.company_name,
          subscription_status: dealer.subscription_status,
          monthly_query_limit: dealer.monthly_query_limit,
          queries_used_this_month: dealer.queries_used_this_month,
          queries_remaining: dealer.monthly_query_limit - dealer.queries_used_this_month,
          usage_percentage: usagePercentage,
          billing_period_start: dealer.billing_period_start,
          billing_period_end: dealer.billing_period_end,
          created_at: dealer.created_at,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get dashboard data' 
      });
    }
  });

  // Get usage stats
  fastify.get('/usage', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      return reply.send({
        success: true,
        usage: {
          queries_used_this_month: dealer.queries_used_this_month,
          monthly_query_limit: dealer.monthly_query_limit,
          queries_remaining: dealer.monthly_query_limit - dealer.queries_used_this_month,
          billing_period_start: dealer.billing_period_start,
          billing_period_end: dealer.billing_period_end,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get usage stats' 
      });
    }
  });

  // Regenerate API key
  fastify.post('/regenerate-key', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      // Generate new API key
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      // Update dealer with new API key hash
      await updateDealerAccount(dealer.id, {
        api_key_hash: apiKeyHash,
        api_key_created_at: new Date().toISOString(),
      });

      // Send new API key via email
      await sendDealerApiKey(authAccount.email, apiKey, dealer.company_name);

      return reply.send({
        success: true,
        api_key: apiKey,
        message: 'New API key generated and sent to your email',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to regenerate API key' 
      });
    }
  });

  // Send usage summary email (internal endpoint, could be called by cron)
  fastify.post('/usage-summary', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      // Send usage summary email
      await sendDealerUsageSummary(
        authAccount.email,
        dealer.company_name,
        dealer.queries_used_this_month,
        dealer.monthly_query_limit
      );

      return reply.send({
        success: true,
        message: 'Usage summary sent to email',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to send usage summary' 
      });
    }
  });

  // Get dealer profile information
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      return reply.send({
        success: true,
        dealer: {
          id: dealer.id,
          company_name: dealer.company_name,
          business_address: dealer.business_address,
          business_phone: dealer.business_phone,
          contact_name: dealer.contact_name,
          email: dealer.email,
          federal_firearms_license: dealer.federal_firearms_license,
          subscription_status: dealer.subscription_status,
          monthly_query_limit: dealer.monthly_query_limit,
          queries_used_this_month: dealer.queries_used_this_month,
          api_key_visible: dealer.api_key ? '••••••••••••' + dealer.api_key.slice(-4) : null,
          created_at: dealer.created_at,
          updated_at: dealer.updated_at
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to get dealer profile');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to get profile' 
      });
    }
  });

  // Update dealer profile information
  fastify.put('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      const updates = request.body as {
        company_name?: string;
        business_address?: string;
        business_phone?: string;
        contact_name?: string;
        federal_firearms_license?: string;
      };

      // Only allow updating safe fields
      const allowedUpdates = {
        ...(updates.company_name && { company_name: updates.company_name }),
        ...(updates.business_address && { business_address: updates.business_address }),
        ...(updates.business_phone && { business_phone: updates.business_phone }),
        ...(updates.contact_name && { contact_name: updates.contact_name }),
        ...(updates.federal_firearms_license && { federal_firearms_license: updates.federal_firearms_license }),
        updated_at: new Date().toISOString()
      };

      if (Object.keys(allowedUpdates).length === 1) { // Only updated_at
        return reply.status(400).send({
          success: false,
          error: 'No valid fields provided for update'
        });
      }

      const updatedDealer = await updateDealerAccount(dealer.id, allowedUpdates);

      return reply.send({
        success: true,
        message: 'Profile updated successfully',
        dealer: {
          id: updatedDealer.id,
          company_name: updatedDealer.company_name,
          business_address: updatedDealer.business_address,
          business_phone: updatedDealer.business_phone,
          contact_name: updatedDealer.contact_name,
          email: updatedDealer.email,
          federal_firearms_license: updatedDealer.federal_firearms_license,
          subscription_status: updatedDealer.subscription_status,
          updated_at: updatedDealer.updated_at
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to update dealer profile');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to update profile' 
      });
    }
  });
}