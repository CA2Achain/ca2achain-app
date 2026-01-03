import crypto from 'crypto';
import type { 
  DriverLicenseData, 
  EncryptedPersonaData, 
  EncryptedPrivadoCredential,
  HashReproducibilityData
} from '@ca2achain/shared';

// Import Supabase client for vault access
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Lazy-load Supabase client for vault access (after dotenv loads)
let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment');
    }
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseClient;
};

// Get encryption key from Supabase vault
const getVaultEncryptionKey = async (keyId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', keyId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to retrieve vault encryption key: ${error?.message}`);
  }

  return data.decrypted_secret;
};

// Derive encryption key from vault key
const deriveKey = (vaultKey: string, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(vaultKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

// =============================================
// CORE ENCRYPTION/DECRYPTION
// =============================================

export const encrypt = async (text: string, vaultKeyId: string): Promise<string> => {
  const vaultKey = await getVaultEncryptionKey(vaultKeyId);
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(vaultKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted data
  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
  
  return combined.toString('base64');
};

export const decrypt = async (encryptedData: string, vaultKeyId: string): Promise<string> => {
  const vaultKey = await getVaultEncryptionKey(vaultKeyId);

  const combined = Buffer.from(encryptedData, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(vaultKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// =============================================
// API KEY UTILITIES
// =============================================

// Hash API keys for secure storage
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Generate secure random API key
export const generateApiKey = (): string => {
  return `ca2a_${crypto.randomBytes(32).toString('hex')}`;
};

// =============================================
// BUYER SECRETS ENCRYPTION
// =============================================

// Get vault encryption key ID from environment
export const getVaultKeyId = (): string => {
  const keyId = process.env.VAULT_ENCRYPTION_KEY_ID;
  if (!keyId) {
    throw new Error('VAULT_ENCRYPTION_KEY_ID not set in environment');
  }
  return keyId;
};

// Generate unique encryption key ID for tracking
export const generateEncryptionKeyId = (): string => {
  return crypto.randomUUID();
};

// Encrypt Persona data for buyer_secrets table
export const encryptPersonaData = async (driverLicenseData: DriverLicenseData, personaSessionId: string, vaultKeyId: string): Promise<string> => {
  const personaData: EncryptedPersonaData = {
    driver_license: {
      dl_number: driverLicenseData.dl_number,
      date_of_birth: driverLicenseData.date_of_birth,
      full_name: driverLicenseData.full_name,
      address: driverLicenseData.address,
      issuing_state: driverLicenseData.issuing_state,
      issued_date: driverLicenseData.issued_date,
      expires_date: driverLicenseData.expires_date,
    },
    persona_verification_results: {
      verification_status: 'passed',
      confidence_scores: {
        face_match: undefined,
        document_authenticity: undefined,
      },
      persona_session_id: personaSessionId,
    },
  };
  
  return await encrypt(JSON.stringify(personaData), vaultKeyId);
};

// Decrypt Persona data from buyer_secrets table
export const decryptPersonaData = async (encryptedData: string, vaultKeyId: string): Promise<EncryptedPersonaData> => {
  const decryptedJson = await decrypt(encryptedData, vaultKeyId);
  return JSON.parse(decryptedJson) as EncryptedPersonaData;
};

// Encrypt Privado credential for buyer_secrets table
export const encryptPrivadoCredential = async (credential: EncryptedPrivadoCredential, vaultKeyId: string): Promise<string> => {
  return await encrypt(JSON.stringify(credential), vaultKeyId);
};

// Decrypt Privado credential from buyer_secrets table
export const decryptPrivadoCredential = async (encryptedCredential: string, vaultKeyId: string): Promise<EncryptedPrivadoCredential> => {
  const decryptedJson = await decrypt(encryptedCredential, vaultKeyId);
  return JSON.parse(decryptedJson) as EncryptedPrivadoCredential;
};

// =============================================
// HASH REPRODUCIBILITY FUNCTIONS
// =============================================

// Generate buyer secret for hash reproducibility (SHA256 of buyer UUID + salt)
export const generateBuyerSecret = (buyerUuid: string): string => {
  const salt = process.env.BUYER_SECRET_SALT || 'default_salt_change_in_production';
  return crypto.createHash('sha256').update(buyerUuid + salt).digest('hex');
};

// Normalize address for consistent hash generation
export const normalizeAddress = (address: { street: string; city: string; state: string; zip_code: string }): string => {
  // Normalize to: "123 MAIN ST, LOS ANGELES, CA, 90210"
  const normalizedStreet = address.street.toUpperCase().trim();
  const normalizedCity = address.city.toUpperCase().trim();
  const normalizedState = address.state.toUpperCase().trim();
  const normalizedZip = address.zip_code.replace(/[^0-9]/g, '').slice(0, 5); // First 5 digits only
  
  return `${normalizedStreet}, ${normalizedCity}, ${normalizedState}, ${normalizedZip}`;
};

// Extract hash data from encrypted buyer secrets (for verification workflow)
export const extractHashReproducibilityData = (
  buyerId: string,
  buyerReferenceId: string,
  decryptedPersonaData: EncryptedPersonaData,
  decryptedPrivadoCredential: EncryptedPrivadoCredential,
  complianceEventId: string
): HashReproducibilityData => {
  const buyerSecret = generateBuyerSecret(buyerId);
  const normalizedAddress = normalizeAddress(decryptedPersonaData.driver_license.address);
  
  return {
    buyer_id: buyerId,
    buyer_reference_id: buyerReferenceId,
    buyer_secret: buyerSecret,
    
    // Age commitment data
    zkp_age_proof: JSON.stringify(decryptedPrivadoCredential.zkp_proofs.age_proof),
    date_of_birth: decryptedPersonaData.driver_license.date_of_birth,
    age_verified: decryptedPrivadoCredential.verifiable_credential.credential_subject.age_over_18,
    verified_at_timestamp: new Date().toISOString(),
    
    // Address commitment data
    zkp_address_proof: JSON.stringify(decryptedPrivadoCredential.zkp_proofs.address_proof),
    normalized_buyer_address: normalizedAddress,
    address_verified: decryptedPrivadoCredential.verifiable_credential.credential_subject.address_verified,
    
    // Extraction metadata
    extraction_timestamp: new Date().toISOString(),
    compliance_event_id: complianceEventId,
  };
};

// Generate deterministic commitment hash for blockchain recording
export const generateCommitmentHash = (data: Record<string, any>): string => {
  // Sort keys for deterministic hash generation
  const sortedKeys = Object.keys(data).sort();
  const sortedData = sortedKeys.reduce((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {} as Record<string, any>);
  
  const dataString = JSON.stringify(sortedData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
};