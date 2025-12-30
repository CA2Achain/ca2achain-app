import { z } from 'zod';
import { addressSchema } from '../common/schema.js';
import { privadoAgeProofSchema, privadoAddressProofSchema } from '../verification/schema.js';

// =============================================
// ENCRYPTED PERSONA DATA STRUCTURES
// =============================================

// Driver's license data (only what we need for verification)
export const driverLicenseDataSchema = z.object({
  dl_number: z.string(),
  date_of_birth: z.string().date(), // YYYY-MM-DD format
  full_name: z.object({
    first_name: z.string(),
    last_name: z.string(),
  }),
  address: addressSchema, // Use common address structure
  issued_date: z.string().date(),
  expires_date: z.string().date(),
});

// Complete encrypted persona data structure
export const encryptedPersonaDataSchema = z.object({
  driver_license: driverLicenseDataSchema,
  persona_session_id: z.string(),
});

// =============================================
// ENCRYPTED PRIVADO CREDENTIAL STRUCTURES
// =============================================

// Privado verifiable credential structure
export const privadoCredentialSchema = z.object({
  credential_id: z.string(),
  issuer_did: z.string(),
  subject_did: z.string(), // Buyer's DID
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  credential_subject: z.object({
    id: z.string(), // Subject DID
    age_over_18: z.boolean(),
    dl_verified: z.boolean(),
    address_verified: z.boolean(),
  }),
});

// ZKP proofs generated from credential
export const zkpProofsDataSchema = z.object({
  age_proof: privadoAgeProofSchema,
  address_proof: privadoAddressProofSchema,
  generated_at: z.string().datetime(),
});

// Complete encrypted Privado credential structure
export const encryptedPrivadoCredentialSchema = z.object({
  verifiable_credential: privadoCredentialSchema,
  zkp_proofs: zkpProofsDataSchema,
});

// =============================================
// BUYER SECRETS DATABASE ENTITY
// =============================================

// Complete buyer secrets table schema
export const buyerSecretsSchema = z.object({
  id: z.string().uuid(), // UUIDv7
  buyer_id: z.string().uuid(), // References buyer_accounts(id)
  
  // Encrypted PII data (contains DOB, address for hash reproducibility)
  encrypted_persona_data: encryptedPersonaDataSchema,
  
  // Encrypted ZKP credential data
  encrypted_privado_credential: encryptedPrivadoCredentialSchema,
  
  // Encryption metadata
  encryption_key_id: z.string().uuid(),
  persona_verification_session: z.string().optional(),
  
  created_at: z.string().datetime(),
});

// =============================================
// HASH REPRODUCIBILITY EXTRACTION
// =============================================

// Data extraction for hash generation (aligns with verification schema)
export const hashReproducibilityDataSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_reference_id: z.string(), // 'BUY_a8b9c2d1'
  buyer_secret: z.string(), // SHA256(buyer_uuid + secret_salt)
  
  // Age commitment data (from verification schema)
  zkp_age_proof: z.string(), // Serialized privadoAgeProofSchema
  age_verified: z.boolean(),
  verified_at_timestamp: z.string().datetime(),
  
  // Address commitment data (from verification schema)  
  zkp_address_proof: z.string(), // Serialized privadoAddressProofSchema
  normalized_buyer_address: z.string(), // Extracted and normalized from persona data
  address_verified: z.boolean(),
  
  // Extraction metadata
  extraction_timestamp: z.string().datetime(),
  compliance_event_id: z.string().uuid(),
});