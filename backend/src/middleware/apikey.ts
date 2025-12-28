import { FastifyRequest, FastifyReply } from 'fastify';
import { getDealerByApiKeyHash } from '../services/supabase.js';
import { hashApiKey } from '../services/encryption.js';

// Extend FastifyRequest to include dealer
declare module 'fastify' {
  interface FastifyRequest {
    dealer?: {
      id: string;
      company_name: string;
      monthly_query_limit: number;
      queries_used_this_month: number;
      subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
    };
  }
}

// API key validation middleware for dealer API access
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ 
        success: false,
        error: 'Missing or invalid authorization header',
        message: 'Include your API key: Authorization: Bearer ca2a_your_key_here'
      });
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey || !apiKey.startsWith('ca2a_')) {
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid API key format',
        message: 'API key must start with ca2a_'
      });
    }

    // Hash the API key to compare with stored hash
    const apiKeyHash = hashApiKey(apiKey);

    // Look up dealer by API key hash
    const dealer = await getDealerByApiKeyHash(apiKeyHash);

    if (!dealer) {
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid API key',
        message: 'API key not found or has been revoked'
      });
    }

    // Check subscription status
    if (!['active', 'trialing'].includes(dealer.subscription_status)) {
      return reply.status(403).send({ 
        success: false,
        error: 'Subscription inactive',
        subscription_status: dealer.subscription_status,
        message: 'Please update your subscription to continue using the API'
      });
    }

    // Check if dealer has exceeded query limit
    if (dealer.queries_used_this_month >= dealer.monthly_query_limit) {
      return reply.status(429).send({ 
        success: false,
        error: 'Monthly query limit exceeded',
        queries_used: dealer.queries_used_this_month,
        query_limit: dealer.monthly_query_limit,
        message: 'Upgrade your plan or wait for next billing cycle'
      });
    }

    // Attach dealer to request for use in routes
    request.dealer = {
      id: dealer.id,
      company_name: dealer.company_name,
      monthly_query_limit: dealer.monthly_query_limit,
      queries_used_this_month: dealer.queries_used_this_month,
      subscription_status: dealer.subscription_status,
    };

    // Log API usage for monitoring
    request.log.info(`API request from dealer: ${dealer.company_name} (${dealer.queries_used_this_month}/${dealer.monthly_query_limit} queries used)`);

  } catch (error) {
    request.log.error({ error }, 'API key middleware error');
    return reply.status(500).send({ 
      success: false,
      error: 'Internal server error',
      message: 'Please try again or contact support'
    });
  }
}