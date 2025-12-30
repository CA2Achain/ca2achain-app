import crypto from 'crypto';
import type { 
  DriverLicenseData, 
  EncryptedPersonaData, 
  EncryptedPrivadoCredential,
  HashReproducibilityData
} from '@ca2achain/shared';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Derive encryption key from master key
const deriveKey = (password: string, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

// =============================================
// CORE ENCRYPTION/DECRYPTION
// =============================================

export const encrypt = (text: string): string => {
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY not set');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted data
  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
  
  return combined.toString('base64');
};

export const decrypt = (encryptedData: string): string => {
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY not set');
  }

  const combined = Buffer.from(encryptedData, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(masterKey, salt);
  
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
// BUYER SECRETS ENCRYPTION (NEW SCHEMA)
// =============================================

// Generate unique encryption key ID for tracking
export const generateEncryptionKeyId = (): string => {
  return crypto.randomUUID();
};

// Encrypt Persona data for buyer_secrets table
export const encryptPersonaData = (driverLicenseData: DriverLicenseData, personaSessionId: string): EncryptedPersonaData => {
  return {
    driver_license: {
      dl_number: driverLicenseData.dl_number,
      date_of_birth: driverLicenseData.date_of_birth,
      full_name: driverLicenseData.full_name,
      address: driverLicenseData.address,
      issued_date: driverLicenseData.issued_date,
      expires_date: driverLicenseData.expires_date,
    },
    persona_session_id: personaSessionId,
  };
};

// Decrypt Persona data from buyer_secrets table
export const decryptPersonaData = (encryptedData: string): EncryptedPersonaData => {
  const decryptedJson = decrypt(encryptedData);
  return JSON.parse(decryptedJson) as EncryptedPersonaData;
};

// Encrypt Privado credential for buyer_secrets table
export const encryptPrivadoCredential = (credential: EncryptedPrivadoCredential): string => {
  return encrypt(JSON.stringify(credential));
};

// Decrypt Privado credential from buyer_secrets table
export const decryptPrivadoCredential = (encryptedCredential: string): EncryptedPrivadoCredential => {
  const decryptedJson = decrypt(encryptedCredential);
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