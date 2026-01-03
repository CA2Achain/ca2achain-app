import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser, sendLoginOtp, verifyOtp } from '../services/auth.js';
import { getUserRole } from '../services/database/user-roles.js';
import { authLoginSchema, roleSelectionSchema } from '@ca2achain/shared';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', createRouteSchema({
    tags: ['auth'],
    summary: 'Register new user',
    description: 'Checks if user exists, creates auth.users + user_roles if not, sends magic link',
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
      
      // User already exists - send them to login with OTP
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

  // Login existing user
  fastify.post('/login', createRouteSchema({
    tags: ['auth'],
    summary: 'Login existing user',
    description: 'Sends OTP to existing user',
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

      await sendLoginOtp(email);

      return sendSuccess(reply, {
        email,
        message: `Verification code sent to ${email}`
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
      
      return sendError(reply, error.message || 'Failed to send verification code', 500);
    }
  });

  // Verify OTP
  fastify.post('/verify-otp', createRouteSchema({
    tags: ['auth'],
    summary: 'Verify OTP code',
    description: 'Verifies 6-digit OTP and returns JWT with role',
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        token: { type: 'string', pattern: '^[0-9]{6}$' }
      },
      required: ['email', 'token']
    }
  }), async (request, reply) => {
    try {
      const { email, token } = request.body as { email: string, token: string };

      const result = await verifyOtp(email, token);
      
      if (!result.user) {
        return sendError(reply, 'Verification failed', 400);
      }

      const userRole = await getUserRole(result.user.id);

      if (!userRole) {
        return sendError(reply, 'Account setup incomplete. Please contact support.', 400);
      }

      return sendSuccess(reply, {
        access_token: result.session?.access_token,
        refresh_token: result.session?.refresh_token,
        role: userRole,
        user: {
          id: result.user.id,
          email: result.user.email
        }
      }, 200);

    } catch (error: any) {
      console.error('Verify OTP error:', error);
      
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        return sendError(reply, 'Invalid or expired code. Please request a new one.', 400);
      }
      
      return sendError(reply, 'Verification failed', 500);
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