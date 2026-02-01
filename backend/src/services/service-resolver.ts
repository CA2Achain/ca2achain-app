/**
 * Service Resolver - Automatically chooses real or mock services
 * 
 * Exports all payment and verification services needed for safe capture flow
 */

// Check which services have API keys available
const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
const hasPersonaKey = !!process.env.PERSONA_API_KEY;

// Log which services will be mocked
if (!hasStripeKey || !hasPersonaKey) {
  console.log('🧪 Some services will use mocks for development:');
  if (!hasStripeKey) {
    console.log('   - Stripe: Using MOCK service (no STRIPE_SECRET_KEY)');
  }
  if (!hasPersonaKey) {
    console.log('   - Persona: Using MOCK service (no PERSONA_API_KEY)');
  }
  console.log('💡 Add API keys to .env to use real services');
}

// =============================================
// STRIPE PAYMENT FUNCTIONS (Safe Capture Flow)
// =============================================

// For now, always use mock services
// TODO: Add conditional imports for real services when API keys present
export * from './mocks/stripe.js';

// Re-export specific functions needed for payment flow
export {
  createBuyerCheckoutSession,
  verifyBuyerPayment,
  captureBuyerPayment,    // NEW: Capture after ID passes
  refundBuyerPayment,     // NEW: Refund if ID fails
  createDealerSubscriptionCheckout,
  verifyDealerSubscription,
  verifyWebhookSignature,
  getDealerSubscriptionDetails,
  cancelDealerSubscription,
  updateDealerSubscriptionPlan,
  resumeDealerSubscription,
  updateDealerBillingInfo,
  getCustomerDetails,
  getSubscriptionDetails,
  initStripe
} from './mocks/stripe.js';

// =============================================
// PERSONA VERIFICATION FUNCTIONS
// =============================================

import {
  createBuyerInquiry,
  getVerificationData,
  getVerifiedPersonaData,
  verifyPersonaWebhook,
  getInquiryStatus,
  getInquiryByBuyerId,
  isBuyerVerified,
  simulatePersonaWebhook
} from './mocks/persona.js';

// Export Persona functions as a service object
export const PersonaService = {
  createBuyerInquiry,
  getVerificationData,
  getVerifiedPersonaData,
  verifyPersonaWebhook,
  getInquiryStatus,
  getInquiryByBuyerId,
  isBuyerVerified,
  simulatePersonaWebhook
};

// Also export individual functions for direct use
export {
  createBuyerInquiry,
  getVerificationData,
  getVerifiedPersonaData,
  verifyPersonaWebhook,
  getInquiryStatus,
  getInquiryByBuyerId,
  isBuyerVerified,
  simulatePersonaWebhook
};

// Export mock services for testing
export * as MockStripe from './mocks/stripe.js';
export * as MockPersona from './mocks/persona.js';

// =============================================
// SERVICE STATUS & LOGGING
// =============================================

/**
 * Get current service status (real vs mock)
 */
export const getServiceStatus = () => {
  return {
    stripe: hasStripeKey ? 'REAL' : 'MOCK',
    persona: hasPersonaKey ? 'REAL' : 'MOCK',
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'REAL' : 'MISSING',
    resend: !!process.env.RESEND_API_KEY ? 'REAL' : 'MISSING',
    encryption: !!process.env.ENCRYPTION_KEY ? 'REAL' : 'MISSING',
  };
};

/**
 * Log service status to console
 */
export const logServiceStatus = () => {
  const status = getServiceStatus();
  console.log('\n🔧 Service Status:');
  console.log('==================');
  Object.entries(status).forEach(([service, state]) => {
    const emoji = state === 'REAL' ? '✅' : state === 'MOCK' ? '🧪' : '❌';
    console.log(`   ${emoji} ${service}: ${state}`);
  });
  console.log('\n💡 Safe Capture Flow: authorize → ID check → capture only if ID passes\n');
};