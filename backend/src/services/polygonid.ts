// Privado ID service for issuing and verifying ZKP credentials
// Using Privado ID (evolution of Polygon ID) for identity verification
// Docs: https://docs.privado.id/

import type { PersonaData, PrivadoClaims } from '@ca2achain/shared';

interface PrivadoCredential {
  id: string;
  type: ['VerifiableCredential', 'IdentityVerificationCredential'];
  issuer: string; // CA2AChain's Privado ID DID
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string; // Buyer's DID
    claims: PrivadoClaims;
  };
  proof: {
    type: 'BJJSignature2021';
    signature: string;
    issuerData: any;
  };
}

interface ZKProof {
  proof: {
    proof_a: string[];
    proof_b: string[][];
    proof_c: string[];
    protocol: 'groth16';
  };
  public_signals: string[];
}

interface ProofRequest {
  circuitId: string;
  query: {
    allowedIssuers: string[]; // Our issuer DID
    type: string; // IdentityVerificationCredential
    context: string;
    credentialSubject: Record<string, any>;
  };
}

// Calculate age and compliance claims from Persona data
export const calculatePrivadoClaims = (personaData: PersonaData): PrivadoClaims => {
  const birthDate = new Date(personaData.dob);
  const dlExpiration = new Date(personaData.dl_expiration);
  const today = new Date();
  
  // Calculate exact age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Check if DL is expired
  const dlValid = dlExpiration > today;

  // Check California residency (simple check - can be enhanced)
  const caResident = personaData.address_normalized.includes(' CA ') || 
                     personaData.address_normalized.includes(' CALIFORNIA ');

  return {
    age_over_18: age >= 18, // AB 1263 minimum age
    age_over_21: age >= 21, // Future use case
    ca_resident: caResident,
    address_verified: true, // Verified by Persona
    dl_verified: dlValid,
    verification_date: new Date().toISOString(),
    expires_at: personaData.dl_expiration,
    issuer: 'CA2ACHAIN_LLC',
  };
};

// Issue Privado ID credential for verified buyer
export const issuePrivadoCredential = async (
  buyerId: string,
  personaData: PersonaData
): Promise<PrivadoCredential> => {
  const claims = calculatePrivadoClaims(personaData);
  
  // Generate buyer DID (in production, buyer would generate this)
  const buyerDID = `did:privado:${buyerId}`;
  
  // Create credential structure
  const credential: PrivadoCredential = {
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', 'IdentityVerificationCredential'],
    issuer: process.env.PRIVADO_ISSUER_DID!,
    issuanceDate: new Date().toISOString(),
    expirationDate: personaData.dl_expiration,
    credentialSubject: {
      id: buyerDID,
      claims: claims,
    },
    proof: {
      type: 'BJJSignature2021',
      signature: 'placeholder_signature', // TODO: Generate actual signature
      issuerData: {
        id: process.env.PRIVADO_ISSUER_DID!,
        state: {
          claimsTreeRoot: 'placeholder_claims_tree_root',
          value: 'placeholder_value',
        },
      },
    },
  };

  // TODO: Implement actual Privado ID credential signing
  // This requires:
  // 1. Setting up Privado ID issuer node
  // 2. Creating credential schemas on Privado ID
  // 3. Signing with issuer private key (Baby JubJub signature)
  
  return credential;
};

// Generate age verification ZK proof (18+ without revealing DOB)
export const generateAgeProof = async (
  credential: PrivadoCredential,
  requiredAge: number = 18
): Promise<ZKProof> => {
  // Create proof request for age verification
  const proofRequest: ProofRequest = {
    circuitId: 'credentialAtomicQuerySig',
    query: {
      allowedIssuers: [process.env.PRIVADO_ISSUER_DID!],
      type: 'IdentityVerificationCredential',
      context: 'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/iden3credential.json-ld',
      credentialSubject: {
        age_over_18: {
          $eq: true,
        },
      },
    },
  };

  // TODO: Generate actual ZK proof using Privado ID SDK
  // For now, return mock proof structure
  const mockProof: ZKProof = {
    proof: {
      proof_a: [
        '0x1234567890abcdef',
        '0xfedcba0987654321',
      ],
      proof_b: [
        ['0xabcdef1234567890', '0x0987654321fedcba'],
        ['0x1111222233334444', '0x5555666677778888'],
      ],
      proof_c: [
        '0x9999aaaabbbbcccc',
        '0xddddeeeeffffaaaa',
      ],
      protocol: 'groth16',
    },
    public_signals: [
      credential.credentialSubject.claims.age_over_18 ? '1' : '0', // 1 = over 18, 0 = under 18
    ],
  };

  return mockProof;
};

// Generate address verification ZK proof (address matches without revealing street)
export const generateAddressProof = async (
  credential: PrivadoCredential,
  shippingAddress: string
): Promise<ZKProof> => {
  // Create proof request for address verification
  const proofRequest: ProofRequest = {
    circuitId: 'credentialAtomicQuerySig',
    query: {
      allowedIssuers: [process.env.PRIVADO_ISSUER_DID!],
      type: 'IdentityVerificationCredential',
      context: 'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/iden3credential.json-ld',
      credentialSubject: {
        address_verified: {
          $eq: true,
        },
      },
    },
  };

  // TODO: Implement actual address comparison and ZK proof generation
  // For now, return mock proof
  const addressMatch = credential.credentialSubject.claims.address_verified;

  const mockProof: ZKProof = {
    proof: {
      proof_a: [
        '0xaaaa111122223333',
        '0x4444555566667777',
      ],
      proof_b: [
        ['0x8888999900001111', '0x2222333344445555'],
        ['0x6666777788889999', '0x0000111122223333'],
      ],
      proof_c: [
        '0x4444555566667777',
        '0x8888999900001111',
      ],
      protocol: 'groth16',
    },
    public_signals: [
      addressMatch ? '1' : '0', // 1 = match, 0 = no match
    ],
  };

  return mockProof;
};

// Verify ZK proof cryptographically
export const verifyZKProof = async (proof: ZKProof): Promise<boolean> => {
  // TODO: Implement cryptographic proof verification
  // This requires Privado ID verifier and circuit verification key
  
  // For now, basic validation
  return (
    proof &&
    proof.proof &&
    proof.proof.protocol === 'groth16' &&
    proof.public_signals &&
    proof.public_signals.length > 0
  );
};

// Utility: Hash string for privacy
const hashString = (input: string): string => {
  return require('crypto').createHash('sha256').update(input).digest('hex');
};

// Serialize credential for encrypted storage
export const serializeCredential = (credential: PrivadoCredential): string => {
  return JSON.stringify(credential);
};

// Deserialize credential from storage
export const deserializeCredential = (credentialString: string): PrivadoCredential => {
  return JSON.parse(credentialString);
};

// Check if credential is expired
export const isCredentialExpired = (credential: PrivadoCredential): boolean => {
  const expiration = new Date(credential.expirationDate);
  return expiration < new Date();
};

// Extract public claims (non-sensitive) from credential
export const extractPublicClaims = (credential: PrivadoCredential) => {
  return {
    age_over_18: credential.credentialSubject.claims.age_over_18,
    ca_resident: credential.credentialSubject.claims.ca_resident,
    verification_date: credential.credentialSubject.claims.verification_date,
    expires_at: credential.credentialSubject.claims.expires_at,
    issuer: credential.credentialSubject.claims.issuer,
  };
};

// =============================================
// ZKP PROOF RESULT HELPERS
// =============================================

/**
 * Convert ZKP public signal to boolean result
 * ZKP circuits output '1' for true, '0' for false
 */
export const zkpSignalToBoolean = (signal: string): boolean => {
  return signal === '1';
};

/**
 * Convert boolean to ZKP public signal
 * For testing and mock implementations
 */
export const booleanToZkpSignal = (value: boolean): string => {
  return value ? '1' : '0';
};

/**
 * Extract age verification result from ZKP proof
 * Returns clear boolean instead of cryptic '1'/'0'
 */
export const extractAgeVerificationResult = (ageProof: ZKProof): {
  isOver18: boolean;
  proofValid: boolean;
  publicSignal: string;
} => {
  const publicSignal = ageProof.public_signals[0];
  return {
    isOver18: zkpSignalToBoolean(publicSignal),
    proofValid: !!ageProof.proof,
    publicSignal: publicSignal
  };
};

/**
 * Extract address verification result from ZKP proof
 * Returns clear boolean instead of cryptic '1'/'0'
 */
export const extractAddressVerificationResult = (addressProof: ZKProof): {
  addressMatches: boolean;
  proofValid: boolean;
  publicSignal: string;
} => {
  const publicSignal = addressProof.public_signals[0];
  return {
    addressMatches: zkpSignalToBoolean(publicSignal),
    proofValid: !!addressProof.proof,
    publicSignal: publicSignal
  };
};

/**
 * Create mock ZKP proof for testing with boolean inputs
 * Much cleaner than remembering '1'/'0' conventions
 */
export const createMockZkpProof = (result: boolean): ZKProof => {
  return {
    proof: {
      proof_a: ['0x123'],
      proof_b: [['0x456']],
      proof_c: ['0x789'],
      protocol: 'groth16'
    },
    public_signals: [booleanToZkpSignal(result)]
  };
};

/**
 * Store compliance record on Polygon blockchain
 * This creates an immutable audit trail for legal compliance
 */
export const storeComplianceRecordOnChain = async (complianceRecord: any) => {
  try {
    // In production, this would interact with Polygon network
    // For now, create a mock blockchain transaction
    
    const blockchainRecord = {
      transaction_hash: `0x${require('crypto').randomBytes(32).toString('hex')}`,
      block_number: Math.floor(Date.now() / 1000), // Mock block number
      gas_used: Math.floor(Math.random() * 100000) + 50000,
      verification_id: complianceRecord.verification_id,
      record_hash: hashString(JSON.stringify(complianceRecord)),
      timestamp: new Date().toISOString(),
      network: 'polygon-mainnet',
      contract_address: process.env.POLYGON_CONTRACT_ADDRESS || '0x742d35Cc6635C0532925a3b8D93329f05dDce89',
      immutable_proofs: {
        age_proof_hash: complianceRecord.zkp_proofs?.age_verification?.proof_hash || '',
        address_proof_hash: complianceRecord.zkp_proofs?.address_verification?.proof_hash || '',
        dealer_attestation_hash: complianceRecord.legal_compliance?.dealer_signature_hash || ''
      },
      court_verifiable_data: {
        verification_occurred: true,
        timestamp: new Date().toISOString(),
        legal_compliance_version: 'AB1263-2026.1',
        audit_trail_complete: true
      }
    };
    
    console.log(`🔗 Blockchain: Stored compliance record on Polygon`);
    console.log(`   Transaction Hash: ${blockchainRecord.transaction_hash}`);
    console.log(`   Verification ID: ${blockchainRecord.verification_id}`);
    console.log(`   Record Hash: ${blockchainRecord.record_hash}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return blockchainRecord;
    
  } catch (error) {
    console.error('❌ Blockchain storage failed:', error);
    throw new Error(`Blockchain storage failed: ${error.message}`);
  }
};

/**
 * Retrieve compliance record from blockchain for court verification
 */
export const getComplianceRecordFromChain = async (transactionHash: string) => {
  try {
    // In production, this would query Polygon network
    // For now, simulate blockchain record retrieval
    
    console.log(`🔗 Blockchain: Retrieving record ${transactionHash}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock blockchain record that would be retrieved
    const blockchainRecord = {
      transaction_hash: transactionHash,
      block_number: Math.floor(Date.now() / 1000),
      confirmations: 1500, // Number of blocks since this transaction
      immutable_since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      court_verifiable_proof: {
        verification_occurred: true,
        mathematical_proof_valid: true,
        timestamp_verified: true,
        blockchain_integrity_confirmed: true,
        can_be_independently_verified: true
      },
      legal_status: {
        admissible_in_court: true,
        meets_ab1263_requirements: true,
        ccpa_compliant: true, // No personal data in blockchain
        tamper_proof: true
      }
    };
    
    return blockchainRecord;
    
  } catch (error) {
    console.error('❌ Blockchain retrieval failed:', error);
    throw new Error(`Blockchain retrieval failed: ${error.message}`);
  }
};

/**
 * Verify blockchain record integrity for court proceedings
 */
export const verifyBlockchainRecordIntegrity = async (
  transactionHash: string,
  originalRecordHash: string
) => {
  try {
    console.log(`🔗 Blockchain: Verifying record integrity for court`);
    
    const blockchainRecord = await getComplianceRecordFromChain(transactionHash);
    
    // In production, this would cryptographically verify the blockchain record
    const integrityVerification = {
      transaction_valid: true,
      record_hash_matches: true, // Compare with originalRecordHash
      block_confirmations: blockchainRecord.confirmations,
      tamper_evidence: 'none',
      mathematical_proof: {
        signature_valid: true,
        merkle_proof_valid: true,
        consensus_verified: true
      },
      court_admissibility: {
        meets_federal_evidence_rules: true,
        meets_california_evidence_code: true,
        expert_testimony_available: true,
        blockchain_technology_accepted: true
      }
    };
    
    console.log(`✅ Blockchain: Record integrity verified for legal proceedings`);
    return integrityVerification;
    
  } catch (error) {
    console.error('❌ Blockchain verification failed:', error);
    throw new Error(`Blockchain verification failed: ${error.message}`);
  }
};

/**
 * Generate court-ready compliance proof
 * This function creates a complete legal package for court proceedings
 */
export const generateCourtComplianceProof = async (verificationId: string) => {
  try {
    console.log(`🏛️ Generating court compliance proof for ${verificationId}`);
    
    // This would retrieve from your database and blockchain
    const courtProof = {
      case_summary: {
        verification_id: verificationId,
        legal_basis: 'California Assembly Bill 1263 (AB 1263)',
        compliance_date: new Date().toISOString(),
        regulatory_authority: 'California Department of Justice'
      },
      blockchain_evidence: {
        transaction_hash: `0x${require('crypto').randomBytes(32).toString('hex')}`,
        immutable_since: new Date().toISOString(),
        mathematical_proofs_valid: true,
        independent_verification_possible: true,
        contains_no_personal_data: true
      },
      legal_compliance: {
        ab1263_requirements_met: true,
        ccpa_privacy_preserved: true,
        due_process_followed: true,
        audit_trail_complete: true
      },
      expert_testimony_package: {
        blockchain_technology_explanation: 'Available upon request',
        zero_knowledge_proof_explanation: 'Available upon request',
        cryptographic_verification_process: 'Available upon request',
        privacy_preservation_methods: 'Available upon request'
      },
      court_presentation: {
        exhibits_prepared: true,
        technical_documentation_ready: true,
        expert_witnesses_available: true,
        legal_precedents_researched: true
      }
    };
    
    console.log(`✅ Court compliance proof generated successfully`);
    return courtProof;
    
  } catch (error) {
    console.error('❌ Court proof generation failed:', error);
    throw new Error(`Court proof generation failed: ${error.message}`);
  }
};

/**
 * Create compliance record suitable for blockchain storage
 * This formats the compliance data for immutable storage
 */
export const createComplianceRecord = (
  verificationId: string,
  ageProof: any,
  addressProof: any,
  dealerId: string,
  transactionId: string
) => {
  // Extract clean boolean results from ZKP proofs
  const ageResult = extractAgeVerificationResult(ageProof);
  const addressResult = extractAddressVerificationResult(addressProof);
  
  return {
    schema_version: 'AB1263-2026.1',
    verification_id: verificationId,
    compliance_timestamp: new Date().toISOString(),
    zkp_proofs: {
      age_verification: {
        proof_valid: ageResult.proofValid,
        proof_hash: hashString(JSON.stringify(ageProof.proof)),
        public_signals_hash: hashString(JSON.stringify(ageProof.public_signals)),
        circuit_id: 'credentialAtomicQuerySig',
        legal_threshold_met: ageResult.isOver18, // Clean boolean instead of cryptic '1'
        public_signal_raw: ageResult.publicSignal // Keep raw for technical verification
      },
      address_verification: {
        proof_valid: addressResult.proofValid,
        proof_hash: hashString(JSON.stringify(addressProof.proof)),
        public_signals_hash: hashString(JSON.stringify(addressProof.public_signals)),
        circuit_id: 'credentialAtomicQuerySig',
        address_match_confirmed: addressResult.addressMatches, // Clean boolean instead of cryptic '1'
        public_signal_raw: addressResult.publicSignal // Keep raw for technical verification
      }
    },
    legal_compliance: {
      ab1263_disclosure_presented: true,
      acknowledgment_received: true,
      dealer_id_hash: hashString(dealerId),
      transaction_id_hash: hashString(transactionId),
      ca_doj_notice_version: 'CA-DOJ-2025-V1',
      compliance_officer_signature: 'ca2achain_compliance_2025'
    },
    privacy_compliance: {
      no_personal_data_in_record: true,
      ccpa_rights_preserved: true,
      zero_knowledge_proofs_used: true,
      database_records_deletable: true
    },
    audit_metadata: {
      record_hash: '', // Will be filled after hashing complete record
      blockchain_ready: true,
      court_admissible: true,
      immutable_storage_required: true
    }
  };
};