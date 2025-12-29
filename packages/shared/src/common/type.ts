import { z } from 'zod';
import { envSchema } from './schema.js';

// Inferred types from Zod schemas
export type EnvSchema = z.infer<typeof envSchema>;

// Environment validation result
export interface EnvValidationResult {
  success: boolean;
  data?: EnvSchema;
  errors?: string[];
}