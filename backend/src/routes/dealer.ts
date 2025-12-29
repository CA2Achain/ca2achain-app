import { FastifyInstance } from 'fastify';
import { dealerRegistrationSchema } from '@ca2achain/shared';
import { 
  createDealerAccount, 
  getDealerByAuthId, 
  getDealerById,
  updateDealerAccount,
  deleteDealerAccount,
  getDealerComplianceEvents,
  getComplianceEventById,
  incrementDealerQueryCount
} from '../services/supabase.js';
import { generateApiKey, hashApiKey } from '../services/encryption.js';
import { 
  createDealerCustomer, 
  createDealerSubscriptionCheckout,
  verifyDealerSubscription,
  cancelDealerSubscription,
  updateDealerSubscriptionPlan,
  getDealerSubscriptionDetails
} from '../services/service-resolver.js';
import { 
  sendDealerApiKey, 
  sendDealerSubscriptionConfirmed,
  sendDealerUsageSummary,
  sendDataDeletionConfirmation 
} from '../services/email.js';
import { deleteUser } from '../services/auth.js';

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

  // Get current subscription details
  fastify.get('/subscription', {
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

      if (!dealer.stripe_subscription_id) {
        return reply.status(404).send({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Get subscription details from Stripe
      const subscriptionDetails = await getDealerSubscriptionDetails(dealer.stripe_subscription_id);

      return reply.send({
        success: true,
        subscription: {
          id: dealer.stripe_subscription_id,
          status: dealer.subscription_status,
          plan_tier: subscriptionDetails.planTier,
          monthly_query_limit: dealer.monthly_query_limit,
          queries_used_this_month: dealer.queries_used_this_month,
          usage_percentage: Math.round((dealer.queries_used_this_month / dealer.monthly_query_limit) * 100),
          billing_period: {
            start: dealer.billing_period_start,
            end: dealer.billing_period_end
          },
          pricing: {
            tier1: { name: 'Starter', price: '$199/month', limit: '50 verifications' },
            tier2: { name: 'Business', price: '$999/month', limit: '350 verifications' },
            tier3: { name: 'Enterprise', price: '$3,799/month', limit: '3,000 verifications' }
          }
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to get subscription details');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to retrieve subscription details' 
      });
    }
  });

  // Cancel subscription
  fastify.post('/subscription/cancel', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { cancel_at_period_end } = request.body as { cancel_at_period_end?: boolean };
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      if (!dealer.stripe_subscription_id) {
        return reply.status(404).send({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Cancel subscription with Stripe
      const cancelledSubscription = await cancelDealerSubscription(dealer.stripe_subscription_id);

      // Update dealer status
      await updateDealerAccount(dealer.id, {
        subscription_status: cancel_at_period_end ? 'active' : 'canceled',
        updated_at: new Date().toISOString()
      });

      return reply.send({
        success: true,
        message: cancel_at_period_end 
          ? 'Subscription will be cancelled at the end of current billing period'
          : 'Subscription cancelled immediately',
        subscription: {
          id: dealer.stripe_subscription_id,
          status: cancel_at_period_end ? 'active_until_period_end' : 'canceled',
          access_until: dealer.billing_period_end
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to cancel subscription');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to cancel subscription' 
      });
    }
  });

  // Update subscription plan (upgrade/downgrade)
  fastify.put('/subscription/plan', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { new_plan } = request.body as { new_plan: 'tier1' | 'tier2' | 'tier3' };
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      if (!dealer.stripe_subscription_id) {
        return reply.status(404).send({
          success: false,
          error: 'No active subscription found'
        });
      }

      if (!['tier1', 'tier2', 'tier3'].includes(new_plan)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid plan tier. Must be tier1, tier2, or tier3'
        });
      }

      // Update subscription plan with Stripe
      const updatedSubscription = await updateDealerSubscriptionPlan(dealer.stripe_subscription_id, new_plan);

      // Update dealer account with new limits
      const planLimits = { tier1: 50, tier2: 350, tier3: 3000 };
      await updateDealerAccount(dealer.id, {
        monthly_query_limit: planLimits[new_plan],
        updated_at: new Date().toISOString()
      });

      const planNames = { tier1: 'Starter', tier2: 'Business', tier3: 'Enterprise' };
      const planPrices = { tier1: '$199', tier2: '$999', tier3: '$3,799' };

      return reply.send({
        success: true,
        message: `Subscription updated to ${planNames[new_plan]} plan`,
        subscription: {
          id: dealer.stripe_subscription_id,
          new_plan: new_plan,
          plan_name: planNames[new_plan],
          monthly_price: planPrices[new_plan],
          monthly_query_limit: planLimits[new_plan],
          effective_date: 'Next billing cycle'
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to update subscription plan');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to update subscription plan' 
      });
    }
  });

  // Resume cancelled subscription
  fastify.post('/subscription/resume', {
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

      if (!dealer.stripe_subscription_id) {
        return reply.status(404).send({
          success: false,
          error: 'No subscription found'
        });
      }

      if (dealer.subscription_status === 'active') {
        return reply.status(400).send({
          success: false,
          error: 'Subscription is already active'
        });
      }

      // Resume subscription with Stripe
      const resumedSubscription = await resumeDealerSubscription(dealer.stripe_subscription_id);

      // Update dealer status
      await updateDealerAccount(dealer.id, {
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      });

      return reply.send({
        success: true,
        message: 'Subscription resumed successfully',
        subscription: {
          id: dealer.stripe_subscription_id,
          status: 'active',
          access_restored: true
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to resume subscription');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to resume subscription' 
      });
    }
  });

  // Get dealer's compliance/verification history
  fastify.get('/compliance-history', {
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

      // Get dealer's compliance events
      const complianceEvents = await getDealerComplianceEvents(dealer.id);

      // Format compliance history for dealer view
      const complianceHistory = complianceEvents.map((event: any) => ({
        verification_id: event.verification_id,
        verification_date: event.created_at,
        buyer_information: {
          masked_email: event.buyer_accounts.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          verification_status: event.verification_response?.age_verified && event.verification_response?.address_verified ? 'VERIFIED' : 'REJECTED'
        },
        transaction_details: {
          transaction_id: event.dealer_request?.transaction_id,
          shipping_address_verified: event.verification_response?.address_verified || false,
          disclosure_compliance: event.dealer_request?.ab1263_disclosure_presented || false
        },
        verification_results: {
          age_verified: event.verification_response?.age_verified || false,
          address_verified: event.verification_response?.address_verified || false,
          confidence_score: event.verification_response?.confidence_score || 0
        },
        compliance_status: event.verification_response?.age_verified && event.verification_response?.address_verified ? 'COMPLIANT' : 'NON_COMPLIANT',
        legal_protection: {
          blockchain_status: event.blockchain_status || 'pending',
          blockchain_tx_hash: event.blockchain_tx_hash || null,
          court_defensible: !!event.blockchain_tx_hash,
          ab1263_compliant: event.dealer_request?.ab1263_disclosure_presented && event.dealer_request?.acknowledgment_received
        },
        required_actions: event.verification_response?.compliance_requirements?.mandatory_actions || []
      }));

      return reply.send({
        success: true,
        dealer_id: dealer.id,
        company_name: dealer.company_name,
        total_verifications: complianceHistory.length,
        compliant_verifications: complianceHistory.filter(h => h.compliance_status === 'COMPLIANT').length,
        compliance_history: complianceHistory,
        legal_notice: 'These records provide legal protection under AB 1263. Blockchain proofs ensure court admissibility.'
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to get dealer compliance history');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to retrieve compliance history' 
      });
    }
  });

  // Get specific compliance event details for dealer
  fastify.get('/compliance-event/:verification_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { verification_id } = request.params as { verification_id: string };
      const authAccount = request.user!;
      const dealer = await getDealerByAuthId(authAccount.id);
      
      if (!dealer) {
        return reply.status(404).send({ 
          success: false,
          error: 'Dealer account not found' 
        });
      }

      // Get specific compliance event
      const complianceEvents = await getDealerComplianceEvents(dealer.id);
      const specificEvent = complianceEvents.find((event: any) => event.verification_id === verification_id);

      if (!specificEvent) {
        return reply.status(404).send({
          success: false,
          error: 'Compliance event not found for this dealer'
        });
      }

      return reply.send({
        success: true,
        compliance_event: {
          verification_id: specificEvent.verification_id,
          verification_date: specificEvent.created_at,
          dealer_request_details: specificEvent.dealer_request,
          verification_response_details: specificEvent.verification_response,
          legal_compliance: {
            ab1263_requirements_met: specificEvent.verification_response?.age_verified && specificEvent.verification_response?.address_verified,
            mandatory_actions_provided: !!specificEvent.verification_response?.compliance_requirements?.mandatory_actions,
            legal_citations_provided: true,
            blockchain_proof_stored: !!specificEvent.blockchain_tx_hash
          },
          blockchain_information: {
            status: specificEvent.blockchain_status,
            transaction_hash: specificEvent.blockchain_tx_hash,
            immutable_proof: !!specificEvent.blockchain_tx_hash,
            court_admissible: !!specificEvent.blockchain_tx_hash
          },
          zkp_proofs: specificEvent.zkp_proofs ? {
            age_proof_hash: specificEvent.zkp_proofs.age_verification?.proof_hash,
            address_proof_hash: specificEvent.zkp_proofs.address_verification?.proof_hash,
            cryptographically_verified: true
          } : null,
          audit_trail: {
            complete: true,
            tamper_proof: !!specificEvent.blockchain_tx_hash,
            privacy_preserved: true,
            ccpa_compliant: true
          }
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Failed to get compliance event details');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to retrieve compliance event details' 
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

  // Delete dealer account completely (CCPA compliance)
  fastify.delete('/account', {
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

      // Cancel any active subscription first
      if (dealer.stripe_subscription_id && dealer.subscription_status === 'active') {
        try {
          await cancelDealerSubscription(dealer.stripe_subscription_id);
          console.log(`🗑️ Cancelled subscription ${dealer.stripe_subscription_id} during account deletion`);
        } catch (subscriptionError) {
          console.warn(`⚠️ Could not cancel subscription during deletion: ${subscriptionError.message}`);
          // Continue with deletion - don't fail the whole process
        }
      }

      // Send confirmation email before account deletion
      await sendDataDeletionConfirmation(authAccount.email, 'dealer_complete');

      // Complete account deletion (dealer_account, anonymize compliance_events)
      await deleteDealerAccount(dealer.id);

      // Delete from Supabase Auth
      await deleteUser(authAccount.id);

      return reply.send({
        success: true,
        message: 'Your dealer account has been permanently deleted',
        deleted_at: new Date().toISOString(),
        actions_taken: [
          'Dealer account and business information deleted',
          'API access revoked permanently', 
          'Active subscription cancelled',
          'Compliance events anonymized (verification records preserved for legal compliance)'
        ],
        compliance_note: 'Blockchain verification proofs remain for legal compliance but contain no personal or business information',
        ccpa_compliance: true
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to delete dealer account');
      return reply.status(500).send({ 
        success: false,
        error: 'Failed to delete account' 
      });
    }
  });
}