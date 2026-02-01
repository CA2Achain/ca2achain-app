/**
 * Mock Persona Service - Clean Implementation
 * 
 * Only exports functions actually used in 2+1 buyer verification flow
 * Inquiry object structure: { id, attributes: { 'session-token' } }
 */

import { randomUUID } from 'crypto';

const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

const mockInquiries = new Map();
const mockInquiryStatuses = new Map();
const mockVerifiedData = new Map();

console.log('🧪 Using MOCK Persona service for development');

// =============================================
// CORE FUNCTION: CREATE BUYER INQUIRY
// Used in: POST /buyer/start-verification
// =============================================

/**
 * Create a Persona inquiry for buyer identity verification
 * Returns structure with: { id, attributes: { 'session-token' } }
 */
export const createBuyerInquiry = async (buyerId: string) => {
  await mockDelay();
  
  const inquiryId = `inq_mock_${randomUUID().slice(0, 8)}`;
  const sessionToken = `session_${randomUUID()}`;
  
  const inquiry = {
    id: inquiryId,
    type: 'inquiries',
    attributes: {
      'session-token': sessionToken,
      'inquiry-template-id': 'tmpl_mock',
      status: 'pending',
      created_at: new Date().toISOString(),
      'reference-id': buyerId  // Links to buyer
    },
    relationships: {
      accounts: {
        data: []
      }
    }
  };
  
  mockInquiries.set(inquiryId, inquiry);
  mockInquiryStatuses.set(inquiryId, { status: 'pending', decision: null });
  
  console.log(`✅ Mock Persona: Created inquiry ${inquiryId}`);
  
  return inquiry;
};

// =============================================
// HELPER FUNCTION: GET INQUIRY STATUS
// Used in: Webhook processing to determine pass/fail
// =============================================

/**
 * Get inquiry status - for webhook decision
 */
export const getInquiryStatus = async (inquiryId: string) => {
  await mockDelay();
  
  const inquiryData = mockInquiryStatuses.get(inquiryId);
  if (!inquiryData) {
    console.warn(`⚠️  Mock Persona: Inquiry not found ${inquiryId}`);
    return { status: 'unknown', decision: null };
  }
  
  console.log(`✅ Mock Persona: Got inquiry status: ${inquiryData.status} / ${inquiryData.decision}`);
  
  return inquiryData;
};

// =============================================
// HELPER FUNCTION: GET VERIFIED DATA
// Used in: Webhook processing after ID passes (for CCPA storage)
// =============================================

/**
 * Get verified buyer data after ID check passed
 * Returns verified persona data or null if not verified
 * Used to retrieve verified name, DOB, address after successful ID verification
 */
export const getVerifiedPersonaData = async (inquiryId: string) => {
  await mockDelay();
  
  const verifiedData = mockVerifiedData.get(inquiryId);
  if (!verifiedData) {
    console.warn(`⚠️  Mock Persona: No verified data for ${inquiryId}`);
    return null;
  }
  
  console.log(`✅ Mock Persona: Retrieved verified data for ${inquiryId}`);
  return verifiedData;
};

// =============================================
// WEBHOOK SIGNATURE VERIFICATION
// Used in: Webhook endpoint to verify authenticity
// =============================================

/**
 * Verify Persona webhook signature
 * In development/test, always returns true
 */
export const verifyPersonaWebhook = (payload: string, signature: string, secret: string) => {
  console.log(`✅ Mock Persona: Webhook signature verified`);
  return true;
};

// =============================================
// TESTING HELPERS (not used in production flow)
// =============================================

/**
 * Simulate user completing verification (passed)
 * Use this in tests to simulate Persona webhook firing
 */
export const simulatePersonaWebhookPassed = async (inquiryId: string) => {
  await mockDelay();
  
  const inquiryData = mockInquiryStatuses.get(inquiryId);
  if (!inquiryData) throw new Error(`Inquiry not found`);
  
  inquiryData.status = 'completed';
  inquiryData.decision = 'approved';
  inquiryData.completed_at = new Date().toISOString();
  
  mockInquiryStatuses.set(inquiryId, inquiryData);
  
  // Store verified data for test access
  mockVerifiedData.set(inquiryId, {
    name: 'John Doe',
    date_of_birth: '1990-01-01',
    address: '123 Main St, City, ST 12345',
    document_number: 'DL123456789'
  });
  
  console.log(`✅ Mock Persona: Simulated PASSED verification for ${inquiryId}`);
  return inquiryData;
};

/**
 * Simulate user failing verification
 */
export const simulatePersonaWebhookFailed = async (inquiryId: string) => {
  await mockDelay();
  
  const inquiryData = mockInquiryStatuses.get(inquiryId);
  if (!inquiryData) throw new Error(`Inquiry not found`);
  
  inquiryData.status = 'completed';
  inquiryData.decision = 'declined';
  inquiryData.completed_at = new Date().toISOString();
  inquiryData.decline_reason = 'document_not_readable';
  
  mockInquiryStatuses.set(inquiryId, inquiryData);
  
  console.log(`✅ Mock Persona: Simulated FAILED verification for ${inquiryId}`);
  return inquiryData;
};

// =============================================
// INITIALIZATION
// =============================================

export const initPersona = () => {
  console.log('✅ Mock Persona service initialized');
  return { mock: true };
};