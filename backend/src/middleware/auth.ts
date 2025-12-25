import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase } from '../services/supabase.js';

export interface AuthUser {
  id: string;
  email: string;
  type: 'user' | 'customer';
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// Supabase JWT validation middleware for authenticated users and customers
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const { data: { user }, error } = await getSupabase().auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Determine if user or customer based on metadata
    const userType = user.user_metadata?.type || 'user';

    // Attach user to request
    request.user = {
      id: user.id,
      email: user.email!,
      type: userType,
    };

  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}