export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  
  // Buyer
  BUYER_REGISTER: '/buyer/register',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_VERIFY_IDENTITY: '/buyer/verify-identity',
  BUYER_VERIFICATION_STATUS: '/buyer/verification-status',
  
  // Dealer
  DEALER_PROFILE: '/dealer/profile',
  DEALER_GENERATE_API_KEY: '/dealer/generate-api-key',
  DEALER_VERIFICATIONS: '/dealer/verifications',
  DEALER_VERIFICATION_BY_ID: (id: string) => `/dealer/verifications/${id}`,
  
  // Verification API
  VERIFY: '/verify',
  VERIFY_BY_ID: (id: string) => `/verify/${id}`,
  VERIFY_HISTORY: '/verify/history',
} as const

export default API_ENDPOINTS