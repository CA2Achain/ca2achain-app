import { FastifyRequest, FastifyReply } from 'fastify';
import { getClient } from '../services/database/connection.js';
import { getBuyerByAuth } from '../services/database/buyer-accounts.js';
import { getDealerByAuth } from '../services/database/dealer-accounts.js';
import { getUserRole } from '../services/database/user-roles.js';
import type { BuyerAccount, DealerAccount } from '@ca2achain/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: 'buyer' | 'dealer' | null;
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

    // Get role from user_roles table (single source of truth)
    const role = await getUserRole(user.id);

    // Cast to correct type
    const userRole: 'buyer' | 'dealer' | null = role === 'buyer' || role === 'dealer' ? role : null;

    // Get account data based on role
    let accountData = null;
    if (userRole === 'buyer') {
      accountData = await getBuyerByAuth(user.id);
    } else if (userRole === 'dealer') {
      accountData = await getDealerByAuth(user.id);
    }

    // Set user on request
    request.user = {
      id: user.id,
      email: user.email!,
      role: userRole,
      account_data: accountData
    };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return reply.status(500).send({ 
      success: false,
      error: 'Authentication error' 
    });
  }
}