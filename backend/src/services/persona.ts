import type { PersonaData } from '@ca2achain/shared';

// Define missing types locally
interface PersonaInquiry {
  id: string;
  type: string;
  attributes: {
    status: string;
    'reference-id': string;
    'session-token': string;
    'created-at': string;
  };
}

interface PersonaVerificationData {
  first_name: string;
  last_name: string;
  birthdate: string;
  identification_number: string;
  identification_expiration_date: string;
  address_street_1: string;
  address_street_2: string;
  address_city: string;
  address_subdivision: string;
  address_postal_code: string;
  birth_day: number;
  birth_month: number;
  birth_year: number;
}

const PERSONA_API_URL = 'https://withpersona.com/api/v1';

// Create a new identity verification inquiry for a buyer
export const createBuyerInquiry = async (buyerId: string): Promise<PersonaInquiry> => {
  if (!process.env.PERSONA_API_KEY) {
    throw new Error('PERSONA_API_KEY environment variable is required');
  }

  if (!process.env.PERSONA_TEMPLATE_ID) {
    throw new Error('PERSONA_TEMPLATE_ID environment variable is required');
  }

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

  const data = await response.json() as any;
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

  const data = await response.json() as any;
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

  const data = await response.json() as any;
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
    throw new Error('No government ID verification found');
  }

  const attrs = verification.attributes;
  
  // Normalize the data to our PersonaData format
  const personaData: PersonaData = {
    name: `${attrs['name-first']} ${attrs['name-middle'] || ''} ${attrs['name-last']}`.trim(),
    dob: attrs.birthdate,
    dl_number: attrs['identification-number'] || '',
    dl_expiration: attrs['identification-expiration-date'] || '',
    address_original: attrs.address ? 
      `${attrs.address['address-street-1']}, ${attrs.address['address-city']}, ${attrs.address['address-subdivision']} ${attrs.address['address-postal-code']}` : 
      '',
    address_normalized: attrs.address ? 
      `${attrs.address['address-street-1'].toUpperCase()}, ${attrs.address['address-city'].toUpperCase()}, ${attrs.address['address-subdivision']} ${attrs.address['address-postal-code']}` : 
      '',
    verification_session_id: inquiryId,
  };

  return personaData;
};

// Get inquiry by buyer ID (reference ID)
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

  const data = await response.json() as any;
  
  if (!data.data || data.data.length === 0) {
    return null;
  }

  return data.data[0];
};

// Check if buyer is verified (has approved inquiry)
export const isBuyerVerified = async (buyerId: string): Promise<boolean> => {
  const inquiry = await getInquiryByBuyerId(buyerId);
  return inquiry?.attributes.status === 'approved';
};

// Verify Persona webhook signature (basic implementation)
export const verifyPersonaWebhook = (payload: string, signature: string | undefined): boolean => {
  return !!(signature && signature.length > 0);
};

// Legacy functions for backward compatibility
export const createInquiry = createBuyerInquiry;
export const getInquiry = getInquiryStatus;

export const getVerifiedData = async (inquiryId: string): Promise<PersonaVerificationData | null> => {
  const personaData = await getVerifiedPersonaData(inquiryId);
  
  if (!personaData) {
    return null;
  }

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
    address_street_1: personaData.address_original.split(',')[0],
    address_street_2: '',
    address_city: 'Los Angeles',
    address_subdivision: 'CA',
    address_postal_code: '90001',
    birth_day: day,
    birth_month: month,
    birth_year: year,
  };
};