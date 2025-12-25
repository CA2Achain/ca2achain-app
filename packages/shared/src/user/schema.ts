import { z } from 'zod';

export const userRegistrationSchema = z.object({
  email: z.string().email(),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;