import { z } from 'zod';

export const auditLogSchema = z.object({
  user_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  claim_verified: z.string(),
  ip_address: z.string().ip(),
  result: z.enum(['approved', 'denied']),
});

export type AuditLogInput = z.infer<typeof auditLogSchema>;