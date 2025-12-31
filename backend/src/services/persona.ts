// Persona service - Identity verification for buyer registration
// Handles driver's license verification and data extraction for CA2ACHAIN identity-as-a-service
// Core workflow: Create inquiry → Verify ID → Extract data → Store encrypted

import type { EncryptedPersonaData } from '@ca2achain/shared';
import { getCurrentTimestamp } from './utilities.js';

// =============================================
// PERSONA API INTEGRATION
// =============================================

const PERSONA_API_URL = 'https://withpersona.com/api/v1';

/**
 * Create new identity verification inquiry for buyer
 * Returns session token for buyer to complete verification
 */
export const createBuyerInquiry = async (buyerId: string): Promise<{ inquiryId: string; sessionToken: string }> => {
  if (!process.env.PERSONA_API_KEY) {
    throw new Error('PERSONA_API_KEY environment variable is required');
  }

  if (!process.env.PERSONA_TEMPLATE_ID) {
    throw new Error('PERSONA_TEMPLATE_ID environment variable is required');
  }

  try {
    const response = await fetch(`${PERSONA_API_URL}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'inquiry',
          attributes: {
            'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
            'reference-id': buyerId,
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Persona API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Persona inquiry created for buyer ${buyerId}: ${data.data.id}`);
    
    return {
      inquiryId: data.data.id,
      sessionToken: data.data.attributes['session-token']
    };

  } catch (error) {
    console.error('❌ Failed to create Persona inquiry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Persona inquiry creation failed: ${errorMessage}`);
  }
};

/**
 * Check verification status and extract verified data
 * Called after buyer completes verification to get results
 */
export const getVerificationData = async (inquiryId: string): Promise<EncryptedPersonaData | null> => {
  if (!process.env.PERSONA_API_KEY) {
    throw new Error('PERSONA_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Persona API error: ${response.status}`);
    }

    const data = await response.json();
    const inquiry = data.data;

    // Check if verification is complete and approved
    if (inquiry.attributes.status !== 'completed' || inquiry.attributes['decision-status'] !== 'approved') {
      console.log(`⏳ Verification not complete for inquiry ${inquiryId}: ${inquiry.attributes.status}`);
      return null;
    }

    // Extract driver's license data from verification results
    const verifications = data.included?.filter((item: any) => item.type === 'verification') || [];
    const documentVerification = verifications.find((v: any) => 
      v.attributes['verification-template']?.name?.includes('government-id') ||
      v.attributes['document-type'] === 'drivers-license'
    );

    if (!documentVerification) {
      throw new Error('Driver\'s license verification not found');
    }

    // Extract verified data using existing schema structure
    const extractedData = documentVerification.attributes.extracted;
    
    const personaData: EncryptedPersonaData = {
      driver_license: {
        dl_number: extractedData['identification-number'] || '',
        date_of_birth: extractedData.birthdate || '',
        full_name: {
          first_name: extractedData['first-name'] || '',
          last_name: extractedData['last-name'] || ''
        },
        address: {
          street: extractedData['address-street-1'] || '',
          street_2: extractedData['address-street-2'],
          city: extractedData['address-city'] || '',
          state: extractedData['address-subdivision'] || '',
          zip_code: extractedData['address-postal-code'] || '',
          country: 'US'
        },
        issued_date: extractedData['identification-issue-date'] || '',
        expires_date: extractedData['identification-expiration-date'] || ''
      },
      persona_session_id: inquiryId
    };

    console.log(`✅ Verification data extracted for inquiry ${inquiryId}`);
    return personaData;

  } catch (error) {
    console.error('❌ Failed to get verification data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Verification data retrieval failed: ${errorMessage}`);
  }
};

/**
 * Get inquiry status without extracting full data
 * Used for checking verification progress
 */
export const getInquiryStatus = async (inquiryId: string): Promise<{ status: string; decision?: string }> => {
  if (!process.env.PERSONA_API_KEY) {
    throw new Error('PERSONA_API_KEY environment variable is required');
  }

  try {
    const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Persona API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      status: data.data.attributes.status,
      decision: data.data.attributes['decision-status']
    };

  } catch (error) {
    console.error('❌ Failed to get inquiry status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Inquiry status check failed: ${errorMessage}`);
  }
};