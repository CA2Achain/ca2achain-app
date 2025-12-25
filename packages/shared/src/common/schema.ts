import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  PERSONA_API_KEY: z.string(),
  PERSONA_TEMPLATE_ID: z.string(),
  POLYGON_RPC_URL: z.string().url(),
  POLYGON_ISSUER_DID: z.string(),
  POLYGON_ISSUER_PRIVATE_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export type EnvSchema = z.infer<typeof envSchema>;