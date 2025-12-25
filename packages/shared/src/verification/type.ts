export interface VerificationResponse {
  result: boolean;
  timestamp: string;
}

export type ClaimType = 'age_over_21' | 'age_over_65' | 'address_verified' | 'identity_verified';