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

      // Check if already verified and not expired
      const isExpired = user.verification_expires_at 
        ? new Date(user.verification_expires_at) < new Date()
        : false;

      if (user.verified_at && !isExpired) {
        return reply.status(400).send({ 
          error: 'User already verified',
          verified_at: user.verified_at,
          expires_at: user.verification_expires_at,
        });
      }

      // If expired, delete old PII before re-verification
      if (isExpired) {
        await deletePIIByUserId(user.id);
      }

      // Create Persona inquiry
      const inquiry = await createInquiry(user.id);

      return reply.send({
        inquiry_id: inquiry.id,
        session_token: inquiry.attributes['session-token'],
        is_reverification: isExpired,
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

      const isExpired = user.verification_expires_at 
        ? new Date(user.verification_expires_at) < new Date()
        : false;

      return reply.send({
        verified: !!user.verified_at && !isExpired,
        verified_at: user.verified_at,
        expires_at: user.verification_expires_at,
        is_expired: isExpired,
        needs_reverification: isExpired,
        has_data: !!pii,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to get status' });
    }
  });
}