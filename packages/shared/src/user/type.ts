export interface User {
  id: string;
  email: string;
  persona_inquiry_id?: string;
  polygon_credential_id?: string;
  verified_at?: string;
  verification_expires_at?: string;
  created_at: string;
}

export interface PIIVault {
  id: string;
  user_id: string;
  encrypted_name: string;
  encrypted_dob: string;
  encrypted_dl_number: string;
  encrypted_dl_expiration: string;
  encrypted_address: string;
  encrypted_polygon_credential: string;
  verified_at: string;
  verification_expires_at: string;
  verification_provider: string;
  verification_session_id: string;
}