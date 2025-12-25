import { FastifyInstance } from 'fastify';
import { getUserByEmail, getPIIByUserId, deletePIIByUserId, getAuditLogsByUserId } from '../services/supabase.js';
import { createInquiry } from '../services/persona.js';
import { sendDeletionConfirmation } from '../services/email.js';
import { deleteUser } from '../services/auth.js';

export default async function userRoutes(fastify: FastifyInstance) {
  // Start identity verification
  fastify.post('/verify-identity', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getUserByEmail(request.user!.email);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check if already verified
      if (user.verified_at) {
        return reply.status(400).send({ error: 'User already verified' });
      }

      // Create Persona inquiry
      const inquiry = await createInquiry(user.id);

      return reply.send({
        inquiry_id: inquiry.id,
        session_token: inquiry.attributes['session-token'],
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to start verification' });
    }
  });

  // Get user's audit logs (who accessed their data)
  fastify.get('/audit-logs', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getUserByEmail(request.user!.email);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const logs = await getAuditLogsByUserId(user.id);

      return reply.send({ logs });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch audit logs' });
    }
  });

  // Delete user data (CCPA compliance)
  fastify.delete('/data', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getUserByEmail(request.user!.email);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Delete PII from vault
      await deletePIIByUserId(user.id);

      // Delete user from Supabase Auth
      await deleteUser(user.id);

      // Send confirmation email
      await sendDeletionConfirmation(user.email);

      return reply.send({ 
        message: 'Your data has been permanently deleted',
        deleted_at: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete data' });
    }
  });

  // Get verification status
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await getUserByEmail(request.user!.email);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const pii = await getPIIByUserId(user.id);

      return reply.send({
        verified: !!user.verified_at,
        verified_at: user.verified_at,
        has_data: !!pii,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to get status' });
    }
  });
}