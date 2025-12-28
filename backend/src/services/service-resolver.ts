/**
 * Service Resolver - Automatically chooses real or mock services
 * Simplified version to avoid TypeScript dynamic import issues
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

// For now, always use mock services to fix TypeScript issues
// TODO: Add proper conditional imports when needed
export * from './mocks/stripe.js';

// Import mock persona functions
import {
  createBuyerInquiry,
  getVerifiedPersonaData,
  verifyPersonaWebhook,
  getInquiryStatus,
  getInquiryByBuyerId,
  isBuyerVerified
} from './mocks/persona.js';

// Export Persona functions as a service object
export const PersonaService = {
  createBuyerInquiry,
  getVerifiedPersonaData,
  verifyPersonaWebhook,
  getInquiryStatus,
  getInquiryByBuyerId,
  isBuyerVerified,
};

// Also export individual mock services for testing
export * as MockStripe from './mocks/stripe.js';
export * as MockPersona from './mocks/persona.js';

// Service status for debugging
export const getServiceStatus = () => {
  return {
    stripe: hasStripeKey ? 'REAL' : 'MOCK',
    persona: hasPersonaKey ? 'REAL' : 'MOCK',
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'REAL' : 'MISSING',
    resend: !!process.env.RESEND_API_KEY ? 'REAL' : 'MISSING',
    encryption: !!process.env.ENCRYPTION_KEY ? 'REAL' : 'MISSING',
  };
};

// Log service status
export const logServiceStatus = () => {
  const status = getServiceStatus();
  console.log('\n🔧 Service Status:');
  console.log('==================');
  Object.entries(status).forEach(([service, state]) => {
    const emoji = state === 'REAL' ? '✅' : state === 'MOCK' ? '🧪' : '❌';
    console.log(`   ${emoji} ${service}: ${state}`);
  });
  console.log('');
};