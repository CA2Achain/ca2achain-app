// Re-export shared types
export * from '@ca2achain/shared'

// TODO: Add frontend-specific types here
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
