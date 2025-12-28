import { FastifyInstance } from 'fastify';
import { sendMagicLink, getUserFromToken, ensureAuthAccountExists } from '../services/auth.js';
import { getAuthAccountByEmail, createAuthAccount } from '../services/supabase.js';
import { authLoginSchema, type AuthLogin, type AuthMeResponse } from '@ca2achain/shared';

export default async function authRoutes(fastify: FastifyInstance) {
  // Send magic link for login/register
  fastify.post('/login', async (request, reply) => {
    try {
      const body = authLoginSchema.parse(request.body) as AuthLogin;

      // Send magic link with account type for new users
      await sendMagicLink(body.email, body.account_type);

      return reply.send({
        success: true,
        message: 'Magic link sent to your email',
        email: body.email,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ 
        success: false,
        error: 'Invalid request' 
      });
    }
  });

  // Verify magic link token and ensure account exists
  fastify.post('/verify', async (request, reply) => {
    try {
      const { token, account_type } = request.body as { 
        token: string; 
        account_type?: 'buyer' | 'dealer' 
      };

      if (!token) {
        return reply.status(400).send({
          success: false,
          error: 'Token is required'
        });
      }

      // Get user from token and ensure auth account exists
      const { supabaseUser, authAccount } = await getUserFromToken(token);

      return reply.send({
        success: true,
        message: 'Authentication successful',
        user: {
          id: authAccount.id,
          email: authAccount.email,
          account_type: authAccount.account_type,
        },
        access_token: token,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(401).send({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }
  });

  // Get current user info (requires authentication)
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // request.user is set by the auth middleware
      const authAccount = await getAuthAccountByEmail(request.user!.email);
      
      if (!authAccount) {
        return reply.status(404).send({ 
          success: false,
          error: 'Account not found' 
        });
      }

      const response: AuthMeResponse = {
        id: authAccount.id,
        email: authAccount.email,
        account_type: authAccount.account_type,
        created_at: authAccount.created_at,
      };

      return reply.send(response);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  });

  // Sign out (invalidate token)
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // With Supabase, we can't invalidate JWT tokens server-side
      // The frontend should remove the token from storage
      
      return reply.send({
        success: true,
        message: 'Signed out successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  });

  // Refresh token endpoint (optional - Supabase handles this client-side)
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refresh_token } = request.body as { refresh_token: string };

      if (!refresh_token) {
        return reply.status(400).send({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Note: Supabase refresh is typically handled client-side
      // This endpoint is here for completeness but may not be used
      
      return reply.status(501).send({
        success: false,
        error: 'Token refresh should be handled client-side with Supabase'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  });
}