// Re-export all shared types and schemas
export * from '@ca2achain/shared';

// Additional backend-specific types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VerificationApiResponse extends ApiResponse {
  verification_id?: string;
  age_verified?: boolean;
  address_verified?: boolean;
  address_match_confidence?: number;
  blockchain_transaction_hash?: string;
}