import crypto from 'crypto';
import type { PersonaData } from '@ca2achain/shared';

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

// Hash API keys for secure storage
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Generate secure random API key
export const generateApiKey = (): string => {
  return `ca2a_${crypto.randomBytes(32).toString('hex')}`;
};

// =============================================
// BUYER SECRETS ENCRYPTION HELPERS
// =============================================

// Generate unique encryption key ID for tracking
export const generateEncryptionKeyId = (): string => {
  return crypto.randomUUID();
};

// Encrypt Persona data for buyer_secrets table
export const encryptPersonaData = (personaData: PersonaData): Record<string, string> => {
  return {
    name: encrypt(personaData.name),
    dob: encrypt(personaData.dob),
    dl_number: encrypt(personaData.dl_number),
    dl_expiration: encrypt(personaData.dl_expiration),
    address_original: encrypt(personaData.address_original),
    address_normalized: encrypt(personaData.address_normalized),
    verification_session_id: encrypt(personaData.verification_session_id)
  };
};

// Decrypt Persona data from buyer_secrets table
export const decryptPersonaData = (encryptedData: Record<string, string>): PersonaData => {
  return {
    name: decrypt(encryptedData.name),
    dob: decrypt(encryptedData.dob),
    dl_number: decrypt(encryptedData.dl_number),
    dl_expiration: decrypt(encryptedData.dl_expiration),
    address_original: decrypt(encryptedData.address_original),
    address_normalized: decrypt(encryptedData.address_normalized),
    verification_session_id: decrypt(encryptedData.verification_session_id)
  };
};

// Encrypt Privado ID credential
export const encryptPrivadoCredential = (credential: any): string => {
  return encrypt(JSON.stringify(credential));
};

// Decrypt Privado ID credential
export const decryptPrivadoCredential = (encryptedCredential: string): any => {
  const decryptedJson = decrypt(encryptedCredential);
  return JSON.parse(decryptedJson);
};