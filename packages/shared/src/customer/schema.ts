import { z } from 'zod';

export const customerRegistrationSchema = z.object({
  company_name: z.string().min(1),
  email: z.string().email(),
  monthly_query_limit: z.number().int().positive().default(1000),
});

export const customerApiKeySchema = z.object({
  api_key: z.string().min(32),
});

export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type CustomerApiKey = z.infer<typeof customerApiKeySchema>;