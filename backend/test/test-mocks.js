#!/usr/bin/env node

/**
 * Quick Test of Mock Services
 * Verifies that mocks work without API keys
 */

import { execSync } from 'child_process';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMockServices() {
  log('🧪 Testing Mock Services', 'blue');
  log('========================', 'blue');

  try {
    // Test mock stripe
    log('\n1. Testing Mock Stripe...', 'yellow');
    const { MockStripe } = await import('../src/services/service-resolver.js');
    
    // Test buyer payment
    const session = await MockStripe.createBuyerCheckoutSession('test@example.com', 'buyer123');
    log(`✅ Created checkout session: ${session.id}`, 'green');
    
    const payment = await MockStripe.verifyBuyerPayment(session.id);
    log(`✅ Verified payment: $${payment.amountPaid / 100}`, 'green');

    // Test dealer subscription
    const customer = await MockStripe.createDealerCustomer('dealer@test.com', 'Test Company');
    log(`✅ Created dealer customer: ${customer.id}`, 'green');

    const subSession = await MockStripe.createDealerSubscriptionCheckout(
      'dealer@test.com', 'Test Company', 'dealer123', 'tier2'
    );
    log(`✅ Created subscription session: ${subSession.id}`, 'green');

    const subscription = await MockStripe.verifyDealerSubscription(subSession.id);
    log(`✅ Verified subscription: ${subscription.planTier} (${subscription.monthlyQueryLimit} queries)`, 'green');

  } catch (err) {
    log(`❌ Mock Stripe test failed: ${err.message}`, 'red');
    return false;
  }

  try {
    // Test mock persona
    log('\n2. Testing Mock Persona...', 'yellow');
    const { MockPersona } = await import('../src/services/service-resolver.js');
    
    // Test verification flow
    const inquiry = await MockPersona.createBuyerInquiry('buyer123');
    log(`✅ Created inquiry: ${inquiry.id}`, 'green');
    
    const status = await MockPersona.getInquiryStatus(inquiry.id);
    log(`✅ Inquiry status: ${status.attributes.status}`, 'green');
    
    const data = await MockPersona.getVerifiedPersonaData(inquiry.id);
    log(`✅ Retrieved verified data: ${data.name}, age ${new Date().getFullYear() - new Date(data.dob).getFullYear()}`, 'green');

  } catch (err) {
    log(`❌ Mock Persona test failed: ${err.message}`, 'red');
    return false;
  }

  try {
    // Test service resolver
    log('\n3. Testing Service Resolver...', 'yellow');
    const { getServiceStatus } = await import('../src/services/service-resolver.js');
    
    const status = getServiceStatus();
    log(`✅ Service status:`, 'green');
    Object.entries(status).forEach(([service, state]) => {
      const emoji = state === 'REAL' ? '✅' : state === 'MOCK' ? '🧪' : '❌';
      log(`   ${emoji} ${service}: ${state}`, 'green');
    });

  } catch (err) {
    log(`❌ Service resolver test failed: ${err.message}`, 'red');
    return false;
  }

  log('\n🎉 All mock services working correctly!', 'green');
  log('\n💡 Next steps:', 'blue');
  log('   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env', 'blue');
  log('   2. Generate ENCRYPTION_KEY with: openssl rand -hex 32', 'blue');  
  log('   3. Start server: npm run dev', 'blue');
  log('   4. Test full backend: npm run test', 'blue');
  log('\n🧪 Mock services will be used automatically when API keys are missing!', 'yellow');
  
  return true;
}

testMockServices().catch(err => {
  log(`\n❌ Test failed: ${err.message}`, 'red');
  process.exit(1);
});