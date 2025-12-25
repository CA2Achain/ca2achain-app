import { z } from 'zod';

export const verificationRequestSchema = z.object({
  user_email: z.string().email(),
  claim_type: z.enum(['age_over_21', 'age_over_65', 'address_verified', 'identity_verified']),
});

export const stripeVerifiedOutputsSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  dob: z.object({
    day: z.number(),
    month: z.number(),
    year: z.number(),
  }),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  id_number: z.string(),
});

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

export type VerificationRequest = z.infer<typeof verificationRequestSchema>;
export type StripeVerifiedOutputs = z.infer<typeof stripeVerifiedOutputsSchema>;