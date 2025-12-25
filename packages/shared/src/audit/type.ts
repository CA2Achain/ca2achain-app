export interface AuditLog {
  id: string;
  user_id: string;
  customer_id: string;
  claim_verified: string;
  timestamp: string;
  ip_address: string;
  result: 'approved' | 'denied';
}