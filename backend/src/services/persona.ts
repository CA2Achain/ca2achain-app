// Persona API client for identity verification
// Docs: https://docs.withpersona.com/reference

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

// Create verification inquiry
export const createInquiry = async (userId: string): Promise<PersonaInquiry> => {
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
          'reference-id': userId,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Persona API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
};

// Get inquiry status and extracted data
export const getInquiry = async (inquiryId: string): Promise<PersonaInquiry> => {
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
  return data.data;
};

// Extract verified data from completed inquiry
export const getVerifiedData = async (inquiryId: string): Promise<PersonaVerificationData | null> => {
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
    return null;
  }

  const attrs = verification.attributes;

  return {
    first_name: attrs['name-first'],
    last_name: attrs['name-last'],
    birthdate: attrs['birthdate'],
    address_street_1: attrs['address-street-1'],
    address_street_2: attrs['address-street-2'],
    address_city: attrs['address-city'],
    address_subdivision: attrs['address-subdivision'],
    address_postal_code: attrs['address-postal-code'],
    identification_number: attrs['identification-number'],
    identification_expiration_date: attrs['identification-expiration-date'],
  };
};

// Verify webhook signature
export const verifyPersonaWebhook = (payload: string, signature: string): boolean => {
  // Implement webhook signature verification
  // See: https://docs.withpersona.com/reference/webhooks
  // For now, basic implementation
  return true; // TODO: Implement proper signature verification
};