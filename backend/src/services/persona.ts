/**
 * Persona Service - Identity verification for buyer registration
 * Integrated with SAFE PAYMENT CAPTURE FLOW
 * 
 * Flow:
 * 1. Create inquiry → buyer completes ID verification
 * 2. Persona webhook fires with result (passed/failed)
 * 3. If PASSED: call /payments/buyer/capture to charge the card
 * 4. If FAILED: call /payments/buyer/refund-hold to release the authorized hold
 */

import type { EncryptedPersonaData } from '@ca2achain/shared';

const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🧪 Using MOCK Persona service for development');

// In-memory mock storage
const mockInquiries = new Map();
const mockVerifiedData = new Map();

// =============================================
// CREATE INQUIRY (Start ID Verification)
// =============================================

/**
 * Create new identity verification inquiry for buyer
 * Returns inquiry ID and session token for buyer to complete verification
 */
export const createBuyerInquiry = async (buyerId: string): Promise<{ inquiryId: string; sessionToken: string }> => {
  await mockDelay();

  const inquiryId = `inq_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionToken = `session_mock_${Math.random().toString(36).slice(2, 8)}`;

  // Store inquiry for later retrieval
  mockInquiries.set(inquiryId, {
    id: inquiryId,
    buyer_id: buyerId,
    status: 'created',
    'reference-id': buyerId,
    'session-token': sessionToken,
    'created-at': new Date().toISOString()
  });

  console.log(`✅ Persona inquiry created for buyer ${buyerId}: ${inquiryId}`);
  console.log(`   Session token: ${sessionToken}`);
  console.log(`   Next: User completes ID verification in modal`);

  return {
    inquiryId,
    sessionToken
  };
};

// =============================================
// GET VERIFICATION DATA (After ID Check Completes)
// =============================================

/**
 * Get verification data and results
 * Called after buyer completes ID verification (via webhook)
 * 
 * Returns driver's license data extracted by Persona
 */
export const getVerificationData = async (inquiryId: string): Promise<EncryptedPersonaData | null> => {
  await mockDelay();

  // Check if already verified
  const verifiedData = mockVerifiedData.get(inquiryId);
  if (verifiedData) {
    console.log(`✅ Retrieved cached verification data for inquiry ${inquiryId}`);
    return verifiedData;
  }

  // Check inquiry status
  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) {
    throw new Error(`Inquiry ${inquiryId} not found`);
  }

  // In mock mode, simulate auto-approval after 2 seconds
  // In real Persona flow: webhook fires when user completes verification
  if (inquiry.status === 'created') {
    console.log(`⏳ Verification in progress for inquiry ${inquiryId}`);
    return null;
  }

  if (inquiry.status !== 'completed' || inquiry['decision-status'] !== 'approved') {
    console.log(`❌ Verification not approved for inquiry ${inquiryId}: ${inquiry.status}`);
    return null;
  }

  // Extract driver's license data (mocked)
  const personaData: EncryptedPersonaData = {
    driver_license: {
      dl_number: 'D1234567',
      date_of_birth: '1990-05-15',
      full_name: {
        first_name: 'John',
        last_name: 'Doe'
      },
      address: {
        street: '123 Main St',
        street_2: undefined,
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90001',
        country: 'US'
      },
      issuing_state: 'CA',
      issued_date: '2015-05-20',
      expires_date: '2025-05-20'
    },
    persona_verification_results: {
      verification_status: 'passed',
      confidence_scores: {
        face_match: 0.98,
        document_authenticity: 0.99
      },
      persona_session_id: inquiryId
    }
  };

  // Cache the result
  mockVerifiedData.set(inquiryId, personaData);

  console.log(`✅ Verification data extracted for inquiry ${inquiryId}`);
  console.log(`   Status: PASSED`);
  console.log(`   Verified: John Doe, DL# D1234567`);
  return personaData;
};

// =============================================
// WEBHOOK HANDLING (Payment Integration)
// =============================================

/**
 * Process Persona webhook
 * Called when buyer completes ID verification
 * Integrates with safe payment capture flow
 */
export const verifyPersonaWebhook = async (
  payload: any,
  signature: string
): Promise<{
  inquiryId: string;
  buyerId: string;
  status: 'passed' | 'failed';
  nextAction: 'capture_payment' | 'refund_hold';
}> => {
  await mockDelay();

  // In production: verify webhook signature
  // For mock: just validate payload structure

  const inquiryId = payload.data?.inquiry_id;
  const status = payload.data?.status;
  const buyerId = payload.data?.attributes?.['reference-id'];

  if (!inquiryId || !status || !buyerId) {
    throw new Error('Invalid webhook payload');
  }

  console.log(`📨 Persona webhook received for inquiry ${inquiryId}`);
  console.log(`   Status: ${status}`);
  console.log(`   Buyer: ${buyerId}`);

  // Update inquiry status
  const inquiry = mockInquiries.get(inquiryId);
  if (inquiry) {
    inquiry.status = 'completed';
    inquiry['decision-status'] = status === 'passed' ? 'approved' : 'rejected';
    mockInquiries.set(inquiryId, inquiry);
  }

  // Determine next action based on ID verification result
  if (status === 'passed') {
    console.log(`✅ ID VERIFICATION PASSED for ${buyerId}`);
    console.log(`   Next Action: CAPTURE PAYMENT (charge the card)`);
    
    return {
      inquiryId,
      buyerId,
      status: 'passed',
      nextAction: 'capture_payment' // Payment endpoint will be called next
    };
  } else {
    console.log(`❌ ID VERIFICATION FAILED for ${buyerId}`);
    console.log(`   Next Action: REFUND HOLD (release authorized funds, no charge)`);
    
    return {
      inquiryId,
      buyerId,
      status: 'failed',
      nextAction: 'refund_hold' // Payment endpoint will be called next
    };
  }
};

// =============================================
// INQUIRY STATUS FUNCTIONS
// =============================================

/**
 * Get inquiry status without extracting full data
 * Used for checking verification progress
 */
export const getInquiryStatus = async (inquiryId: string): Promise<{ status: string; decision?: string }> => {
  await mockDelay();

  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) {
    throw new Error(`Inquiry ${inquiryId} not found`);
  }

  return {
    status: inquiry.status || 'unknown',
    decision: inquiry['decision-status']
  };
};

/**
 * Get inquiry by buyer ID
 */
export const getInquiryByBuyerId = async (buyerId: string): Promise<any | null> => {
  await mockDelay();

  for (const [, inquiry] of mockInquiries) {
    if (inquiry.buyer_id === buyerId) {
      return inquiry;
    }
  }

  return null;
};

/**
 * Check if buyer is verified
 */
export const isBuyerVerified = async (buyerId: string): Promise<boolean> => {
  await mockDelay();

  const inquiry = await getInquiryByBuyerId(buyerId);
  return inquiry?.['decision-status'] === 'approved';
};

/**
 * Get verified persona data (for internal use)
 * Returns the cached extracted data
 */
export const getVerifiedPersonaData = async (inquiryId: string): Promise<EncryptedPersonaData | null> => {
  await mockDelay();

  return mockVerifiedData.get(inquiryId) || null;
};

// =============================================
// MOCK WEBHOOK SIMULATION
// =============================================

/**
 * Simulate Persona webhook after delay (for testing)
 * In production: Persona calls your webhook endpoint
 */
export const simulatePersonaWebhook = async (
  inquiryId: string,
  shouldPass: boolean = true
) => {
  console.log(`\n⏳ Simulating Persona webhook in 2 seconds...`);
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) {
    throw new Error(`Inquiry ${inquiryId} not found`);
  }

  const payload = {
    id: `webhook_mock_${Date.now()}`,
    data: {
      inquiry_id: inquiryId,
      status: shouldPass ? 'passed' : 'failed',
      attributes: {
        'reference-id': inquiry.buyer_id,
        verified_at: new Date().toISOString()
      }
    },
    created_at: new Date().toISOString()
  };

  // Process webhook
  const result = await verifyPersonaWebhook(payload, '');

  console.log(`\n📨 Webhook processed: ${result.nextAction}`);
  return result;
};