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
import buyerRoutes from './routes/buyer.js';
import dealerRoutes from './routes/dealer.js';
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

// Raw body for webhooks (needed for Stripe signature verification)
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'));

// Decorate fastify with auth middleware
fastify.decorate('authenticate', authMiddleware);
fastify.decorate('authenticateApiKey', apiKeyMiddleware);

// Health check
fastify.get('/health', async () => {
  return { 
    status: 'ok', 
    service: 'CA2AChain API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };
});

// API documentation endpoint
fastify.get('/api', async () => {
  return {
    name: 'CA2AChain API',
    description: 'AB 1263 Compliance API for firearm accessory dealers',
    version: '1.0.0',
    docs: process.env.FRONTEND_URL + '/docs',
    endpoints: {
      auth: '/api/auth',
      buyer: '/api/buyer',
      dealer: '/api/dealer', 
      verification: '/api/verify',
      webhooks: '/webhooks',
    },
    features: [
      'Zero-knowledge identity verification',
      'AB 1263 compliance automation',
      'CCPA compliant data handling',
      'Privado ID integration',
      'Stripe payment processing',
    ],
  };
});

// Register routes with proper prefixes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(buyerRoutes, { prefix: '/api/buyer' });
await fastify.register(dealerRoutes, { prefix: '/api/dealer' });
await fastify.register(verificationRoutes, { prefix: '/api' });
await fastify.register(webhookRoutes, { prefix: '/webhooks' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`🚀 CA2AChain API Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📖 API docs: http://localhost:${port}/api`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();