/**
 * Mock Persona Service - COMPLETE WITH CORRECT STRUCTURE
 * 
 * Inquiry object structure: { id, attributes: { 'session-token' } }
 */

import { randomUUID } from 'crypto';

const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

const mockInquiries = new Map();
const mockInquiryStatuses = new Map();
const mockVerifiedData = new Map();

console.log('🧪 Using MOCK Persona service for development');

// =============================================
// CREATE INQUIRY
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
// GET INQUIRY STATUS
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
// GET INQUIRY DATA
// =============================================

export const getInquiry = async (inquiryId: string) => {
  await mockDelay();
  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) throw new Error(`Inquiry not found: ${inquiryId}`);
  return inquiry;
};

export const getInquiryByBuyerId = async (buyerId: string) => {
  await mockDelay();
  
  // Find inquiry by reference-id
  let foundInquiry = null;
  for (const [id, inquiry] of mockInquiries.entries()) {
    if (inquiry.attributes['reference-id'] === buyerId) {
      foundInquiry = inquiry;
      break;
    }
  }
  
  if (!foundInquiry) throw new Error(`No inquiry found for buyer: ${buyerId}`);
  return foundInquiry;
};

// =============================================
// SIMULATE WEBHOOK RESULTS (FOR TESTING)
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
  
  // Store verified data
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
// GET VERIFIED DATA
// =============================================

/**
 * Get verified buyer data (after ID passed)
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
// WEBHOOK PROCESSING HELPER
// =============================================

/**
 * Process Persona webhook (for webhook route)
 * Called from backend/src/routes/persona.ts
 */
export const processPersonaWebhook = async (payload: any) => {
  const inquiryId = payload.data?.inquiry_id;
  const status = payload.data?.status;
  
  if (!inquiryId || !status) {
    throw new Error('Invalid webhook payload');
  }
  
  const inquiryData = mockInquiryStatuses.get(inquiryId);
  if (!inquiryData) {
    throw new Error(`Inquiry not found: ${inquiryId}`);
  }
  
  inquiryData.status = 'completed';
  inquiryData.decision = status === 'passed' ? 'approved' : 'declined';
  inquiryData.webhook_processed_at = new Date().toISOString();
  
  mockInquiryStatuses.set(inquiryId, inquiryData);
  
  console.log(`✅ Mock Persona: Processed webhook - ${inquiryId} ${inquiryData.decision}`);
  
  return {
    inquiryId,
    decision: inquiryData.decision,
    status: 'processed'
  };
};

// =============================================
// VERIFY WEBHOOK SIGNATURE
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
// INITIALIZATION
// =============================================

export const initPersona = () => {
  console.log('✅ Mock Persona service initialized');
  return { mock: true };
};