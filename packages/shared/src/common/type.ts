import { z } from 'zod';
import { 
  envSchema,
  addressSchema,
  normalizedAddressSchema,
  addressStringSchema,
  phoneNumberSchema,
  paymentStatusSchema,
  creditCardInfoSchema,
  stripeInfoSchema,
  paymentInfoSchema,
  paymentProviderInfoSchema
} from './schema.js';

// =============================================
// BASIC STRUCTURE TYPES
// =============================================

// Address types for consistent address handling
export type Address = z.infer<typeof addressSchema>;
export type NormalizedAddress = z.infer<typeof normalizedAddressSchema>;
export type AddressString = z.infer<typeof addressStringSchema>;

// Phone number type
export type PhoneNumber = z.infer<typeof phoneNumberSchema>;

// =============================================
// PAYMENT DATA TYPES
// =============================================

// Payment status type (shared across modules)
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Credit card and payment info types
export type CreditCardInfo = z.infer<typeof creditCardInfoSchema>;
export type StripeInfo = z.infer<typeof stripeInfoSchema>;
export type PaymentInfo = z.infer<typeof paymentInfoSchema>;
export type PaymentProviderInfo = z.infer<typeof paymentProviderInfoSchema>;

// =============================================
// ENVIRONMENT TYPES
// =============================================

// Inferred types from Zod schemas
export type EnvSchema = z.infer<typeof envSchema>;

// Environment validation result
export interface EnvValidationResult {
  success: boolean;
  data?: EnvSchema;
  errors?: string[];
}