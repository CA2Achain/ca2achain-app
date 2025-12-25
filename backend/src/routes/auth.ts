import { FastifyInstance } from 'fastify';
import { sendMagicLink } from '../services/auth.js';
import { createUser, getUserByEmail } from '../services/supabase.js';
import { userRegistrationSchema } from '@ca2achain/shared';

export default async function authRoutes(fastify: FastifyInstance) {
  // Send magic link for login/register
  fastify.post('/login', async (request, reply) => {
    try {
      const { email } = userRegistrationSchema.parse(request.body);

      // Check if user exists in our database
      let user = await getUserByEmail(email);

      // If not, create user record
      if (!user) {
        user = await createUser(email);
      }

      // Send magic link via Supabase Auth
      await sendMagicLink(email);

      return reply.send({
        message: 'Magic link sent to your email',
        email,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send({ error: 'Invalid request' });
    }
  });

  // Callback endpoint (frontend will handle token exchange)
  fastify.get('/callback', async (request, reply) => {
    return reply.send({ message: 'Auth callback - handle on frontend' });
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getUserByEmail(request.user!.email);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        verified_at: user.verified_at,
        created_at: user.created_at,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}