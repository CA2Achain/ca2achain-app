import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyMiddleware } from './middleware/apikey.js';
import { initSupabase } from './services/database/connection.js';
import { initStripe } from './services/service-resolver.js';
import { initResend } from './services/email.js';
import { logServiceStatus } from './services/service-resolver.js';

import authRoutes from './routes/auth.js';
import buyerRoutes from './routes/buyer.js';
import dealerRoutes from './routes/dealer.js';
import verificationRoutes from './routes/verification.js';
import webhookRoutes from './routes/webhooks.js';
import paymentsRoutes from './routes/payments.js';
import healthRoutes from './routes/health.js';

// Load environment variables
dotenv.config();

// Create Fastify instance with basic logging
const fastify = Fastify({ 
  logger: true,
  trustProxy: true
});

// Initialize services
await initSupabase();
initStripe();
initResend();

// Log which services are real vs mocked
logServiceStatus();

// Basic security middleware
await fastify.register(helmet, {
  contentSecurityPolicy: false // Disable for API
});
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Register auth middleware as decorator
fastify.decorate('authenticate', authMiddleware);

// Health check routes (no auth required)
await fastify.register(healthRoutes);

// Authentication routes (magic link login)
await fastify.register(authRoutes, { prefix: '/auth' });

// Buyer routes (protected by auth middleware)
await fastify.register(buyerRoutes, { 
  prefix: '/buyer',
  preHandler: authMiddleware 
});

// Dealer routes (protected by auth or API key middleware) 
await fastify.register(dealerRoutes, { 
  prefix: '/dealer',
  preHandler: [authMiddleware, apiKeyMiddleware]
});

// Verification routes (protected by API key middleware)
await fastify.register(verificationRoutes, { 
  prefix: '/verify',
  preHandler: apiKeyMiddleware
});

// Payment routes (protected by auth middleware)
await fastify.register(paymentsRoutes, { 
  prefix: '/payments',
  preHandler: authMiddleware 
});

// Webhook routes (no auth - uses Stripe signature verification)
await fastify.register(webhookRoutes, { prefix: '/webhooks' });

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);
  
  // Type guard for error object
  const isError = (err: unknown): err is Error => {
    return err instanceof Error;
  };

  // Type guard for validation errors
  const hasValidation = (err: unknown): err is Error & { validation: any } => {
    return isError(err) && 'validation' in err;
  };

  // Type guard for HTTP errors with status codes
  const hasStatusCode = (err: unknown): err is Error & { statusCode: number } => {
    return isError(err) && 'statusCode' in err && typeof (err as any).statusCode === 'number';
  };
  
  // Handle validation errors
  if (hasValidation(error)) {
    reply.status(400).send({
      success: false,
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
    return;
  }

  // Handle auth errors
  if (hasStatusCode(error) && error.statusCode === 401) {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  // Handle other HTTP errors
  if (hasStatusCode(error) && error.statusCode < 500) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.name || 'Client Error',
      message: error.message
    });
    return;
  }

  // Handle server errors
  const errorMessage = isError(error) ? error.message : 'Unknown server error';
  reply.status(500).send({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : errorMessage
  });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 CA2AChain API server listening on port ${port}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    fastify.log.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Server startup failed: ${errorMessage}`);
    process.exit(1);
  }
};

start();