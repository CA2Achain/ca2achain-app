export const ROUTES = {
  // Public
  HOME: '/',
  ABOUT: '/public/about',
  TERMS: '/public/terms',
  PRIVACY: '/public/privacy',
  HOW_IT_WORKS: '/public/how-it-works',
  PRICING: '/public/pricing',
  
  // Auth
  LOGIN: '/auth/login',
  VERIFY_EMAIL: '/auth/verify-email',
  
  // Buyer
  BUYER_PROFILE: '/buyer/profile',
  BUYER_SETTINGS: '/buyer/settings',
  BUYER_VERIFY_IDENTITY: '/buyer/verify-identity',
  
  // Dealer
  DEALER_PROFILE: '/dealer/profile',
  DEALER_SETTINGS: '/dealer/settings',
  DEALER_BILLING: '/dealer/billing',
  DEALER_VERIFICATIONS: '/dealer/verifications',
  DEALER_VERIFICATION_DETAIL: (id: string) => `/dealer/verifications/${id}`,
  
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_COMPLIANCE: '/admin/compliance-events',
} as const
