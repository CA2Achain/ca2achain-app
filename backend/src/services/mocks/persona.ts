/**
 * Mock Persona Service for Development
 * Use this when you don't have Persona API keys yet
 */

import { randomUUID } from 'crypto';

// Mock delay to simulate network requests
const mockDelay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🧪 Using MOCK Persona service for development');

// In-memory storage for mock inquiries
const mockInquiries = new Map();
const mockVerifiedData = new Map();

// Sample verified data for testing
const generateMockPersonaData = (buyerId: string) => {
  const today = new Date();
  const birthDate = new Date('1990-05-15'); // 34 years old
  const dlExpiration = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()); // 2 years from now
  
  return {
    name: 'John A. Doe',
    dob: birthDate.toISOString().split('T')[0], // YYYY-MM-DD format
    dl_number: 'D1234567',
    dl_expiration: dlExpiration.toISOString().split('T')[0],
    address_original: '1234 Main Street, Los Angeles, CA 90001',
    address_normalized: '1234 MAIN ST, LOS ANGELES, CA 90001-1234',
    verification_session_id: `mock_inquiry_${buyerId.slice(0, 8)}`,
  };
};

// =============================================
// BUYER VERIFICATION FUNCTIONS
// =============================================

export const createBuyerInquiry = async (buyerId: string) => {
  await mockDelay();
  
  const inquiryId = `inq_mock_${randomUUID().slice(0, 8)}`;
  const sessionToken = `session_mock_${randomUUID()}`;
  
  const inquiry = {
    id: inquiryId,
    attributes: {
      status: 'created',
      'reference-id': buyerId,
      'session-token': sessionToken,
      'created-at': new Date().toISOString(),
    }
  };
  
  mockInquiries.set(inquiryId, inquiry);
  
  console.log(`🧪 Mock Persona: Created inquiry ${inquiryId} for buyer ${buyerId}`);
  return inquiry;
};

export const getInquiryStatus = async (inquiryId: string) => {
  await mockDelay();
  
  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) {
    throw new Error('Mock inquiry not found');
  }
  
  // Auto-approve inquiries after creation (simulate instant approval for testing)
  if (inquiry.attributes.status === 'created') {
    inquiry.attributes.status = 'approved';
    mockInquiries.set(inquiryId, inquiry);
    
    // Generate mock verified data
    const mockData = generateMockPersonaData(inquiry.attributes['reference-id']);
    mockVerifiedData.set(inquiryId, mockData);
    
    console.log(`🧪 Mock Persona: Auto-approved inquiry ${inquiryId}`);
  }
  
  return inquiry;
};

export const getVerifiedPersonaData = async (inquiryId: string) => {
  await mockDelay();
  
  const inquiry = mockInquiries.get(inquiryId);
  if (!inquiry) {
    return null;
  }
  
  // Only return data if approved
  if (inquiry.attributes.status !== 'approved') {
    return null;
  }
  
  let verifiedData = mockVerifiedData.get(inquiryId);
  if (!verifiedData) {
    // Generate mock data if not exists
    verifiedData = generateMockPersonaData(inquiry.attributes['reference-id']);
    mockVerifiedData.set(inquiryId, verifiedData);
  }
  
  console.log(`🧪 Mock Persona: Retrieved verified data for inquiry ${inquiryId}`);
  return verifiedData;
};

export const getInquiryByBuyerId = async (buyerId: string) => {
  await mockDelay();
  
  // Find inquiry by reference-id (buyer ID)
  for (const inquiry of mockInquiries.values()) {
    if (inquiry.attributes['reference-id'] === buyerId) {
      return inquiry;
    }
  }
  
  return null;
};

export const isBuyerVerified = async (buyerId: string): Promise<boolean> => {
  const inquiry = await getInquiryByBuyerId(buyerId);
  return inquiry?.attributes.status === 'approved' || false;
};

export const verifyPersonaWebhook = (payload: string, signature: string): boolean => {
  // Mock webhook verification - always return true for development
  console.log(`🧪 Mock Persona: Webhook verification (always passes)`);
  return true;
};

// =============================================
// LEGACY FUNCTIONS (for backward compatibility)
// =============================================

export const createInquiry = createBuyerInquiry;
export const getInquiry = getInquiryStatus;

export const getVerifiedData = async (inquiryId: string) => {
  // Legacy function that returns old format
  const personaData = await getVerifiedPersonaData(inquiryId);
  if (!personaData) return null;
  
  // Convert to legacy format
  const [firstName, ...lastNameParts] = personaData.name.split(' ');
  const lastName = lastNameParts.join(' ');
  
  const dobParts = personaData.dob.split('-');
  const year = parseInt(dobParts[0]);
  const month = parseInt(dobParts[1]);
  const day = parseInt(dobParts[2]);
  
  return {
    first_name: firstName,
    last_name: lastName,
    birthdate: personaData.dob,
    identification_number: personaData.dl_number,
    identification_expiration_date: personaData.dl_expiration,
    address_street_1: '1234 Main Street',
    address_street_2: '',
    address_city: 'Los Angeles',
    address_subdivision: 'CA',
    address_postal_code: '90001',
  };
};

console.log('🧪 Mock Persona service initialized');
console.log('💡 To use real Persona, set PERSONA_API_KEY in .env and restart');