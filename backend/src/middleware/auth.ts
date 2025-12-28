import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase, getAuthAccountByEmail } from '../services/supabase.js';

export interface AuthUser {
  id: string;
  email: string;
  account_type: 'buyer' | 'dealer';
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
    const { data: { user }, error } = await getSupabase().auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }

    // Get our auth_account record to determine buyer vs dealer
    const authAccount = await getAuthAccountByEmail(user.email!);
    
    if (!authAccount) {
      return reply.status(401).send({ 
        success: false,
        error: 'Auth account not found' 
      });
    }

    // Attach auth account info to request
    request.user = {
      id: authAccount.id,
      email: authAccount.email,
      account_type: authAccount.account_type,
    };

  } catch (error) {
    request.log.error('Auth middleware error:', error);
    return reply.status(401).send({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
}