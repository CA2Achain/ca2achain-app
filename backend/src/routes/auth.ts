import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendMagicLink, getUserFromToken, verifyOtp } from '../services/auth.js';
import { authLoginSchema, authCallbackSchema, type AuthLogin } from '@ca2achain/shared';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Send magic link for login/register (follows authLoginSchema exactly)
  fastify.post('/login', createRouteSchema({
    tags: ['auth'],
    summary: 'Send magic link',
    description: 'Send magic link for passwordless login. Account type determines which table to create after auth.',
    body: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          description: 'User email address'
        },
        account_type: { 
          type: 'string', 
          enum: ['buyer', 'dealer'],
          description: 'Account type for new registrations'
        }
      },
      required: ['email', 'account_type']
    },
    response: {
      description: 'Magic link sent successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            message: { type: 'string' }
          }
        }
      }
    }
  }), async (request, reply) => {
    try {
      const body = authLoginSchema.parse(request.body) as AuthLogin;

      // Send magic link with account type
      await sendMagicLink(body.email, body.account_type);

      return sendSuccess(reply, {
        email: body.email,
        message: 'Magic link sent to your email'
      }, 200);

    } catch (error) {
      console.error('Auth login error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid email format or account type');
      }
      return sendError(reply, 'Failed to send magic link', 500);
    }
  });

  // Verify magic link token (follows authCallbackSchema)
  fastify.post('/verify', createRouteSchema({
    tags: ['auth'],
    summary: 'Verify magic link token',
    description: 'Verify the magic link token and return authentication session',
    body: {
      type: 'object',
      properties: {
        token: { 
          type: 'string',
          description: 'Magic link token from email'
        },
        type: {
          type: 'string',
          enum: ['magiclink']
        }
      },
      required: ['token', 'type']
    },
    response: {
      description: 'Authentication successful',
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' }
              }
            },
            session: { type: 'object' },
            account_type: { type: 'string', enum: ['buyer', 'dealer'], nullable: true }
          }
        }
      }
    }
  }), async (request, reply) => {
    try {
      const { token, type } = authCallbackSchema.parse(request.body);

      if (type !== 'magiclink') {
        return sendValidationError(reply, 'Only magiclink type is supported');
      }

      // Verify OTP token (for magic link, token is the actual JWT or session)
      const authResult = await getUserFromToken(token);

      return sendSuccess(reply, {
        user: {
          id: authResult.supabaseUser.id,
          email: authResult.supabaseUser.email
        },
        session: authResult.supabaseUser,
        account_type: authResult.accountType
      }, 200);

    } catch (error) {
      console.error('Token verification error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid token format');
      }
      return sendError(reply, 'Invalid or expired token', 401);
    }
  });

  // Get current user info (requires authentication)
  fastify.get('/me', {
    ...createRouteSchema({
      tags: ['auth'],
      summary: 'Get current user',
      description: 'Get authenticated user information from supabaseAuthUserSchema',
      security: authRequired,
      response: {
        description: 'Current user information',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              account_type: { type: 'string', enum: ['buyer', 'dealer'], nullable: true },
              account_data: { 
                type: 'object',
                description: 'Buyer or dealer account data if exists',
                nullable: true
              }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;

      return sendSuccess(reply, {
        id: user.id,
        email: user.email,
        account_type: user.account_type,
        account_data: user.account_data
      }, 200);

    } catch (error) {
      console.error('Get user info error:', error);
      return sendError(reply, 'Failed to get user information', 500);
    }
  });

  // Sign out (client should handle token removal)
  fastify.post('/logout', {
    ...createRouteSchema({
      tags: ['auth'],
      summary: 'Sign out user',
      description: 'Sign out authenticated user (client should remove token from storage)',
      security: authRequired,
      response: {
        description: 'Signed out successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // With Supabase JWT, server-side invalidation is not possible
      // Client should remove token from storage
      
      return sendSuccess(reply, {
        message: 'Signed out successfully'
      }, 200);

    } catch (error) {
      console.error('Logout error:', error);
      return sendError(reply, 'Failed to sign out', 500);
    }
  });
}