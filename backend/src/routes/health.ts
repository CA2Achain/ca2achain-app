// Health check and system status routes
// Simple endpoints for monitoring service health

import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'ca2achain-api'
    };
  });

  // System status check  
  fastify.get('/status', async (request, reply) => {
    return {
      status: 'operational',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  });
}