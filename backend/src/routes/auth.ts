import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser, sendLoginOtp, verifyOtp, getUserFromToken, createUserRoleAfterVerification } from '../services/auth.js';
import { getUserRole } from '../services/database/user-roles.js';
import { authLoginSchema, roleSelectionSchema } from '@ca2achain/shared';
import { createRouteSchema, sendSuccess, sendError, sendValidationError, authRequired } from '../utils/api-responses.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user with role (sends OTP)
  fastify.post('/register', createRouteSchema({
    tags: ['auth'],
    summary: 'Register new user',
    description: 'Register new user with email and role. Sends OTP to email.',
    body: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          description: 'User email address'
        },
        role: { 
          type: 'string', 
          enum: ['buyer', 'dealer'],
          description: 'User role - buyer or dealer'
        }
      },
      required: ['email', 'role']
    },
    response: {
      description: 'OTP sent successfully',
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
      const { email, role } = request.body as { email: string, role: 'buyer' | 'dealer' };

      // Validate inputs
      authLoginSchema.parse({ email });
      roleSelectionSchema.parse({ role });

      // Register user and send OTP
      await registerUser(email, role);

      return sendSuccess(reply, {
        email,
        message: `Verification code sent to ${email}`
      }, 200);

    } catch (error: any) {
      console.error('Register error:', error);
      if (error.message?.includes('already exists')) {
        return sendError(reply, 'Email already registered. Please use login instead.', 400);
      }
      if (error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid email or role');
      }
      return sendError(reply, 'Failed to register user', 500);
    }
  });

  // Login existing user (sends OTP)
  fastify.post('/login', createRouteSchema({
    tags: ['auth'],
    summary: 'Login existing user',
    description: 'Send OTP to existing user email',
    body: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          description: 'User email address'
        }
      },
      required: ['email']
    },
    response: {
      description: 'OTP sent successfully',
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
      const { email } = authLoginSchema.parse(request.body);

      // Send OTP to existing user
      await sendLoginOtp(email);

      return sendSuccess(reply, {
        email,
        message: `Verification code sent to ${email}`
      }, 200);

    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return sendValidationError(reply, 'Invalid email format');
      }
      return sendError(reply, 'Failed to send verification code', 500);
    }
  });

  // Verify OTP code
  fastify.post('/verify-otp', createRouteSchema({
    tags: ['auth'],
    summary: 'Verify OTP code',
    description: 'Verify 6-digit OTP code and return JWT token with role',
    body: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          description: 'User email address'
        },
        token: {
          type: 'string',
          description: '6-digit OTP code',
          pattern: '^[0-9]{6}$'
        },
        role: {
          type: 'string',
          enum: ['buyer', 'dealer'],
          description: 'Role for new users (only needed if registering)'
        }
      },
      required: ['email', 'token']
    },
    response: {
      description: 'Authentication successful',
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            role: { type: 'string', enum: ['buyer', 'dealer'] },
            user: { type: 'object' }
          }
        }
      }
    }
  }), async (request, reply) => {
    try {
      const { email, token, role } = request.body as { 
        email: string, 
        token: string,
        role?: 'buyer' | 'dealer'
      };

      // Verify OTP
      const result = await verifyOtp(email, token);
      
      if (!result.user) {
        return sendError(reply, 'Verification failed', 400);
      }

      // Check if user has role in user_roles table
      let userRole = await getUserRole(result.user.id);

      // If no role exists and role was provided, create it (new registration)
      if (!userRole && role) {
        await createUserRoleAfterVerification(result.user.id, role);
        userRole = role;
      }

      // If still no role, something went wrong
      if (!userRole) {
        return sendError(reply, 'User role not found. Please register first.', 400);
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
        return sendError(reply, 'Invalid or expired verification code', 400);
      }
      return sendError(reply, 'Failed to verify code', 500);
    }
  });

  // Get current user info (with role and account data)
  fastify.get('/me', {
    ...createRouteSchema({
      tags: ['auth'],
      summary: 'Get current user',
      description: 'Get authenticated user info with role and account data',
      security: authRequired,
      response: {
        description: 'User information',
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string', enum: ['buyer', 'dealer'], nullable: true },
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
        role: user.role,
        account_data: user.account_data
      }, 200);

    } catch (error) {
      console.error('Get user info error:', error);
      return sendError(reply, 'Failed to get user info', 500);
    }
  });
}