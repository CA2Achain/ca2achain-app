// Persona API client for identity verification
// Docs: https://docs.withpersona.com/reference

import type { PersonaData } from '@ca2achain/shared';

const PERSONA_API_URL = 'https://withpersona.com/api/v1';

interface PersonaInquiry {
  id: string;
  type: 'inquiry';
  attributes: {
    status: 'created' | 'pending' | 'completed' | 'approved' | 'declined' | 'failed';
    'reference-id': string;
    'session-token'?: string;
  };
}

interface PersonaVerificationData {
  first_name: string;
  last_name: string;
  birthdate: string; // YYYY-MM-DD
  address_street_1: string;
  address_street_2?: string;
  address_city: string;
  address_subdivision: string; // State
  address_postal_code: string;
  identification_number: string; // DL number
  identification_expiration_date: string; // YYYY-MM-DD
}

// Create verification inquiry for buyer
export const createBuyerInquiry = async (buyerId: string): Promise<PersonaInquiry> => {
  const response = await fetch(`${PERSONA_API_URL}/inquiries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      'Content-Type': 'application/json',
      'Persona-Version': '2023-01-05',
    },
    body: JSON.stringify({
      data: {
        type: 'inquiry',
        attributes: {
          'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
          'reference-id': buyerId,
          'note': 'CA2AChain buyer identity verification for AB 1263 compliance',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Persona API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data;
};

// Get inquiry status
export const getInquiryStatus = async (inquiryId: string): Promise<PersonaInquiry> => {
  const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Persona API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data;
};

// Extract and normalize verified data for CA2AChain format
export const getVerifiedPersonaData = async (inquiryId: string): Promise<PersonaData | null> => {
  const response = await fetch(`${PERSONA_API_URL}/inquiries/${inquiryId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
    },
  });

  if (!response.ok) {
    throw new Error(`Persona API error: ${response.statusText}`);
  }

  const data = await response.json();
  const inquiry = data.data;

  // Only return data if inquiry is approved
  if (inquiry.attributes.status !== 'approved') {
    return null;
  }

  // Fetch verification data from included resources
  const verification = data.included?.find((item: any) => 
    item.type === 'verification/government-id'
  );

  if (!verification) {
    throw new Error('No government ID verification found in approved inquiry');
  }

  const attrs = verification.attributes;

  // Construct full name
  const firstName = attrs['name-first'] || '';
  const lastName = attrs['name-last'] || '';
  const fullName = `${firstName} ${lastName}`.trim();

  // Construct original address
  const street1 = attrs['address-street-1'] || '';
  const street2 = attrs['address-street-2'] || '';
  const city = attrs['address-city'] || '';
  const state = attrs['address-subdivision'] || '';
  const zip = attrs['address-postal-code'] || '';
  
  const addressParts = [street1, street2, city, state, zip].filter(Boolean);
  const originalAddress = addressParts.join(', ');

  // For now, original = normalized (we'll normalize with USPS later)
  const normalizedAddress = originalAddress.toUpperCase();

  return {
    name: fullName,
    dob: attrs['birthdate'], // YYYY-MM-DD format
    dl_number: attrs['identification-number'],
    dl_expiration: attrs['identification-expiration-date'], // YYYY-MM-DD format
    address_original: originalAddress,
    address_normalized: normalizedAddress,
    verification_session_id: inquiryId,
  };
};

// Get inquiry by reference ID (buyer ID)
export const getInquiryByBuyerId = async (buyerId: string): Promise<PersonaInquiry | null> => {
  const response = await fetch(`${PERSONA_API_URL}/inquiries?filter[reference-id]=${buyerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
      'Persona-Version': '2023-01-05',
    },
  });

  if (!response.ok) {
    throw new Error(`Persona API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return null;
  }

  // Return the most recent inquiry
  return data.data[0];
};

// Check if buyer has completed verification
export const isBuyerVerified = async (buyerId: string): Promise<boolean> => {
  const inquiry = await getInquiryByBuyerId(buyerId);
  return inquiry?.attributes.status === 'approved' || false;
};

// Verify webhook signature (basic implementation)
export const verifyPersonaWebhook = (payload: string, signature: string): boolean => {
  // TODO: Implement proper webhook signature verification
  // See: https://docs.withpersona.com/reference/webhooks
  // For now, basic validation
  return signature && signature.length > 0;
};

// Legacy functions for backward compatibility
export const createInquiry = createBuyerInquiry;
export const getInquiry = getInquiryStatus;
export const getVerifiedData = async (inquiryId: string): Promise<PersonaVerificationData | null> => {
  const personaData = await getVerifiedPersonaData(inquiryId);
  
  if (!personaData) return null;
  
  // Convert to legacy format
  const nameParts = personaData.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Parse address (basic parsing)
  const addressParts = personaData.address_original.split(', ');
  
  return {
    first_name: firstName,
    last_name: lastName,
    birthdate: personaData.dob,
    address_street_1: addressParts[0] || '',
    address_street_2: addressParts[1] || '',
    address_city: addressParts[addressParts.length - 3] || '',
    address_subdivision: addressParts[addressParts.length - 2] || '',
    address_postal_code: addressParts[addressParts.length - 1] || '',
    identification_number: personaData.dl_number,
    identification_expiration_date: personaData.dl_expiration,
  };
};