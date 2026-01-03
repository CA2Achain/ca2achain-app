import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser, sendLoginLink } from '../services/auth.js';
import { getUserRole } from '../services/database/user-roles.js';
import { authLoginSchema, roleSelectionSchema } from '@ca2achain/shared';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', createRouteSchema({
    tags: ['auth'],
    summary: 'Register new user',
    description: 'Creates auth.users + user_roles, sends magic link',
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['buyer', 'dealer'] }
      },
      required: ['email', 'role']
    }
  }), async (request, reply) => {
    try {
      const { email, role } = request.body as { email: string, role: 'buyer' | 'dealer' };

      authLoginSchema.parse({ email });
      roleSelectionSchema.parse({ role });

      await registerUser(email, role);

      return sendSuccess(reply, {
        email,
        message: `Verification link sent to ${email}. Please check your email.`
      }, 200);

    } catch (error: any) {
      console.error('Register error:', error);
      
      if (error.message === 'EXISTING_USER') {
        return reply.status(409).send({
          success: false,
          error: 'EXISTING_USER',
          message: 'Account already exists. Sending you to login...',
          redirect: '/auth/login'
        });
      }
      
      if (error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid email or role');
      }
      
      return sendError(reply, error.message || 'Registration failed', 500);
    }
  });

  // Login existing user (CHANGED: sends magic link instead of OTP)
  fastify.post('/login', createRouteSchema({
    tags: ['auth'],
    summary: 'Login existing user',
    description: 'Sends magic link to existing user (click to login)',
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' }
      },
      required: ['email']
    }
  }), async (request, reply) => {
    try {
      const { email } = authLoginSchema.parse(request.body);

      await sendLoginLink(email);

      return sendSuccess(reply, {
        email,
        message: `Verification link sent to ${email}. Click the link to login.`
      }, 200);

    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'USER_NOT_FOUND') {
        return reply.status(404).send({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Account not found. Please register first.',
          redirect: '/auth/register'
        });
      }
      
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid email format');
      }
      
      return sendError(reply, error.message || 'Failed to send verification link', 500);
    }
  });

  // Get current user
  fastify.get('/me', {
    ...createRouteSchema({
      tags: ['auth'],
      summary: 'Get current user',
      security: authRequired
    }),
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;

      return sendSuccess(reply, {
        id: user.id,
        email: user.email,
        role: user.role,
        account_data: user.account_data
      }, 200);

    } catch (error) {
      console.error('Get user info error:', error);
      return sendError(reply, 'Failed to get user info', 500);
    }
  });
}