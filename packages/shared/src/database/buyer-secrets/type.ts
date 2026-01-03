import { z } from 'zod';
import {
  driverLicenseDataSchema,
  personaResultsDataSchema,
  encryptedPersonaDataSchema,
  privadoCredentialSchema,
  zkpProofsDataSchema,
  encryptedPrivadoCredentialSchema,
  buyerSecretsSchema,
  hashReproducibilityDataSchema
} from './schema.js';

// =============================================
// BUYER SECRETS ENTITY TYPE
// =============================================

// Main types from schemas
export type DriverLicenseData = z.infer<typeof driverLicenseDataSchema>;
export type personaResultsData = z.infer<typeof personaResultsDataSchema>;
export type EncryptedPersonaData = z.infer<typeof encryptedPersonaDataSchema>;
export type PrivadoCredential = z.infer<typeof privadoCredentialSchema>;
export type ZkpProofsData = z.infer<typeof zkpProofsDataSchema>;
export type EncryptedPrivadoCredential = z.infer<typeof encryptedPrivadoCredentialSchema>;
export type BuyerSecrets = z.infer<typeof buyerSecretsSchema>;
export type HashReproducibilityData = z.infer<typeof hashReproducibilityDataSchema>;

// =============================================
// HASH GENERATION INTERFACES
// =============================================

// Decryption operation (for hash generation only)
export interface BuyerSecretsDecryption {
  buyer_id: string;
  decrypted_persona_data: EncryptedPersonaData;
  decrypted_privado_data: EncryptedPrivadoCredential;
  compliance_event_id: string;
  decryption_timestamp: string;
}