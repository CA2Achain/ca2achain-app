import { FastifyRequest, FastifyReply } from 'fastify';
import { getCustomerByApiKeyHash } from '../services/supabase.js';
import { hashApiKey } from '../services/encryption.js';

// Extend FastifyRequest to include customer
declare module 'fastify' {
  interface FastifyRequest {
    customer?: {
      id: string;
      company_name: string;
      monthly_query_limit: number;
      queries_used_this_month: number;
    };
  }
}

// API key validation middleware for third-party customers
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey || !apiKey.startsWith('ca2a_')) {
      return reply.status(401).send({ error: 'Invalid API key format' });
    }

    // Hash the API key to compare with stored hash
    const apiKeyHash = hashApiKey(apiKey);

    // Look up customer by API key hash
    const customer = await getCustomerByApiKeyHash(apiKeyHash);

    if (!customer) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    // Check subscription status
    if (customer.subscription_status !== 'active' && customer.subscription_status !== 'trialing') {
      return reply.status(403).send({ error: 'Subscription inactive' });
    }

    // Check if customer has exceeded query limit
    if (customer.queries_used_this_month >= customer.monthly_query_limit) {
      return reply.status(429).send({ 
        error: 'Monthly query limit exceeded',
        limit: customer.monthly_query_limit,
        used: customer.queries_used_this_month
      });
    }

    // Attach customer to request
    request.customer = {
      id: customer.id,
      company_name: customer.company_name,
      monthly_query_limit: customer.monthly_query_limit,
      queries_used_this_month: customer.queries_used_this_month,
    };

  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}