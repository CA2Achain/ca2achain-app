import { FastifyRequest, FastifyReply } from 'fastify';
import { getClient } from '../services/database/connection.js';
import { getBuyerByAuth } from '../services/database/buyer-accounts.js';
import { getDealerByAuth } from '../services/database/dealer-accounts.js';
import type { BuyerAccount, DealerAccount } from '@ca2achain/shared';

export interface AuthUser {
  id: string;
  email: string;
  account_type: 'buyer' | 'dealer' | null;
  account_data: BuyerAccount | DealerAccount | null;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// Supabase JWT validation middleware for authenticated buyers and dealers
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ 
        success: false,
        error: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const supabase = getClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }

    // Try to find buyer account first
    const buyerAccountData = await getBuyerByAuth(user.id);
    if (buyerAccountData) {
      request.user = {
        id: user.id,
        email: user.email!,
        account_type: 'buyer',
        account_data: buyerAccountData
      };
      return;
    }

    // Try dealer account
    const dealerAccountData = await getDealerByAuth(user.id);
    if (dealerAccountData) {
      request.user = {
        id: user.id,
        email: user.email!,
        account_type: 'dealer',
        account_data: dealerAccountData
      };
      return;
    }

    // User exists in auth but no account created yet
    request.user = {
      id: user.id,
      email: user.email!,
      account_type: null,
      account_data: null
    };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return reply.status(500).send({ 
      success: false,
      error: 'Authentication error' 
    });
  }
}