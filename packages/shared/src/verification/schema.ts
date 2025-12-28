import { z } from 'zod';

// Dealer's verification request  
export const verificationRequestSchema = z.object({
  buyer_email: z.string().email(),
  buyer_dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shipping_address: z.string().min(10),
  transaction_id: z.string(),
  ab1263_disclosure_presented: z.boolean(),
  acknowledgment_received: z.boolean(),
});

// Privado ID proof request structure
export const privadoProofRequestSchema = z.object({
  circuitId: z.string(),
  query: z.object({
    allowedIssuers: z.array(z.string()), // Your issuer DID
    type: z.string(), // IdentityVerificationCredential
    context: z.string().url(),
    credentialSubject: z.record(z.any()), // Claims to prove
  }),
});

// ZK Proof response from Privado ID
export const privadoProofSchema = z.object({
  proof: z.object({
    pi_a: z.array(z.string()),
    pi_b: z.array(z.array(z.string())),
    pi_c: z.array(z.string()),
    protocol: z.literal('groth16'),
  }),
  pub_signals: z.array(z.string()),
});

// Compliance event record
export const complianceEventSchema = z.object({
  id: z.string().uuid(),
  verification_id: z.string(),
  buyer_id: z.string().uuid(),
  dealer_id: z.string().uuid(),
  
  dealer_request: z.record(z.any()),
  
  // Privado ID verification results
  privado_proofs: z.object({
    age_verification_proof: privadoProofSchema,
    address_verification_proof: privadoProofSchema,
  }),
  
  // AB 1263 compliance attestation
  compliance_attestation: z.object({
    dealer_id: z.string().uuid(),
    ab1263_disclosure_presented: z.boolean(),
    acknowledgment_received: z.boolean(),
    compliance_version: z.string().default('AB1263-2026.1'),
    attestation_timestamp: z.string().datetime(),
  }),
  
  // Blockchain integration
  blockchain_status: z.enum(['pending', 'submitted', 'confirmed', 'failed']),
  polygon_tx_hash: z.string().optional(),
  polygon_block_number: z.number().int().optional(),
  
  // Results
  verification_result: z.enum(['PASS', 'FAIL']),
  age_verified: z.boolean(),
  address_verified: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  
  created_at: z.string().datetime(),
});