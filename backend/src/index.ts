import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyMiddleware } from './middleware/apikey.js';
import { initSupabase } from './services/supabase.js';
import { initStripe } from './services/stripe.js';
import { initResend } from './services/email.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import customerRoutes from './routes/customer.js';
import verificationRoutes from './routes/verification.js';
import webhookRoutes from './routes/webhooks.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Initialize services
initSupabase();
initStripe();
initResend();

// Security middleware
await fastify.register(helmet);
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});

// Decorate fastify with auth middleware
fastify.decorate('authenticate', authMiddleware);
fastify.decorate('authenticateApiKey', apiKeyMiddleware);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(userRoutes, { prefix: '/api/user' });
await fastify.register(customerRoutes, { prefix: '/api/customer' });
await fastify.register(verificationRoutes, { prefix: '/api' });
await fastify.register(webhookRoutes, { prefix: '/webhooks' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();