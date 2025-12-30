import { FastifyRequest, FastifyReply } from 'fastify';
import { getClient } from '../services/database/connection.js';
import { getBuyerByAuth } from '../services/database/buyer-accounts.js';
import { getDealerByAuth } from '../services/database/dealer-accounts.js';

export interface AuthUser {
  id: string;
  email: string;
  account_type: 'buyer' | 'dealer' | null;
  account_data: any; // Will be BuyerAccount or DealerAccount
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
    let accountData = await getBuyerByAuth(user.id);
    if (accountData) {
      request.user = {
        id: user.id,
        email: user.email!,
        account_type: 'buyer',
        account_data: accountData
      };
      return;
    }

    // Try dealer account
    accountData = await getDealerByAuth(user.id);
    if (accountData) {
      request.user = {
        id: user.id,
        email: user.email!,
        account_type: 'dealer',
        account_data: accountData
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