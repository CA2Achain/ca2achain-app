import { FastifyRequest, FastifyReply } from 'fastify';
import { getDealerByApiKey, useDealerCredit } from '../services/database/dealer-accounts.js';
import { hashApiKey } from '../services/encryption.js';
import type { DealerAccount } from '@ca2achain/shared';

// Extend FastifyRequest to include dealer
declare module 'fastify' {
  interface FastifyRequest {
    dealer?: DealerAccount;
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
    const dealer = await getDealerByApiKey(apiKeyHash);

    if (!dealer) {
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid API key',
        message: 'API key not found or has been revoked'
      });
    }

    // Check if dealer has activated subscription
    if (!dealer.subscription_status) {
      return reply.status(403).send({ 
        success: false,
        error: 'No active subscription',
        message: 'Please activate your subscription to use the API'
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

    // Check credit availability (credits can be null if no subscription)
    if (dealer.credits_purchased === null || dealer.credits_used === null) {
      return reply.status(402).send({ 
        success: false,
        error: 'No credits available',
        message: 'Please setup your subscription to get credits.'
      });
    }

    const availableCredits = (dealer.credits_purchased + (dealer.additional_credits_purchased || 0)) - dealer.credits_used;
    const creditsExpired = dealer.credits_expire_at && new Date(dealer.credits_expire_at) < new Date();

    if (availableCredits <= 0 || creditsExpired) {
      return reply.status(402).send({ 
        success: false,
        error: 'Insufficient credits',
        message: 'No verification credits available. Please purchase additional credits.',
        credits_available: Math.max(0, availableCredits),
        credits_expired: creditsExpired
      });
    }

    // For verification endpoints, consume a credit atomically
    if (request.url.includes('/verify') && request.method === 'POST') {
      const creditUsed = await useDealerCredit(dealer.id);
      if (!creditUsed) {
        return reply.status(402).send({ 
          success: false,
          error: 'Credit consumption failed',
          message: 'Unable to deduct verification credit. Please try again.'
        });
      }
    }

    // Attach full dealer account to request
    request.dealer = dealer;

    // Log API usage for monitoring
    const remainingCredits = availableCredits - (request.url.includes('/verify') ? 1 : 0);
    console.log(`API request from dealer: ${dealer.company_name} (${remainingCredits} credits remaining)`);

  } catch (error) {
    console.error('API key middleware error:', error);
    return reply.status(500).send({ 
      success: false,
      error: 'Internal server error',
      message: 'Please try again or contact support'
    });
  }
}