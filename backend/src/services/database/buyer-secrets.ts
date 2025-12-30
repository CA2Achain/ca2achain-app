import { getClient } from './connection.js';
import type { 
  BuyerSecrets,
  EncryptedPersonaData,
  EncryptedPrivadoCredential
} from '@ca2achain/shared';

/**
 * Create buyer secrets (encrypted PII storage)
 * Called after Persona verification + Privado credential issuance
 */
export const createBuyerSecrets = async (
  buyerId: string,
  encryptedPersonaData: EncryptedPersonaData,
  encryptedPrivadoCredential: EncryptedPrivadoCredential,
  encryptionKeyId: string,
  personaVerificationSession?: string
): Promise<boolean> => {
  const { error } = await getClient()
    .from('buyer_secrets')
    .insert({
      buyer_id: buyerId,
      encrypted_persona_data: encryptedPersonaData,
      encrypted_privado_credential: JSON.stringify(encryptedPrivadoCredential),
      encryption_key_id: encryptionKeyId,
      persona_verification_session: personaVerificationSession
    });
    
  if (error) throw new Error(`Failed to create buyer secrets: ${error.message}`);
  return true;
};

/**
 * Get buyer secrets for ZKP proof generation
 * Used during dealer verification requests
 */
export const getBuyerSecrets = async (buyerId: string): Promise<BuyerSecrets | null> => {
  const { data: secrets, error } = await getClient()
    .from('buyer_secrets')
    .select('*')
    .eq('buyer_id', buyerId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get buyer secrets: ${error.message}`);
  }
  return secrets || null;
};

/**
 * Delete buyer secrets (CCPA compliance - encrypted PII removal)
 * This is called by ccpa-privacy.ts during full buyer data deletion
 */
export const deleteBuyerSecrets = async (buyerId: string): Promise<boolean> => {
  const { error } = await getClient()
    .from('buyer_secrets')
    .delete()
    .eq('buyer_id', buyerId);
    
  if (error) throw new Error(`Failed to delete buyer secrets: ${error.message}`);
  return true;
};