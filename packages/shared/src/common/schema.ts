import { z } from 'zod';

// Environment validation
export const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  
  // External services
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  PERSONA_API_KEY: z.string(),
  PERSONA_TEMPLATE_ID: z.string(),
  RESEND_API_KEY: z.string(),
  
  // Privado ID configuration
  PRIVADO_ISSUER_DID: z.string(),
  PRIVADO_ISSUER_PRIVATE_KEY: z.string(),
  PRIVADO_RPC_URL: z.string().url().default('https://polygon-mumbai.g.alchemy.com/v2/your-key'),
  PRIVADO_SCHEMA_HASH: z.string(),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

// Standard API response wrapper
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
});