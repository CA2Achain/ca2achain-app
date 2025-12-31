// TODO: Add frontend-specific user types
export interface AuthUser {
  id: string
  email: string
  role: 'buyer' | 'dealer' | 'admin'
}
