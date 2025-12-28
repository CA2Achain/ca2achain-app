-- 1
CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('buyer', 'seller')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2
CREATE TABLE buyer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  auth_id UUID NOT NULL REFERENCES auth_accounts(id),
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'expired', 'rejected')),
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,
  
  -- ZKP commitment hashes (public, no PII)
  age_commitment_hash TEXT, -- ZKP proof of 18+ without revealing DOB
  address_commitment_hash TEXT, -- ZKP proof of address without revealing street
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_id)
);

-- 3
CREATE TABLE buyer_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  buyer_id UUID NOT NULL REFERENCES buyer_accounts(id),
  
  -- Encrypted commitment ingredients (only you can decrypt)
  encrypted_zkp_secrets JSONB NOT NULL,
  /* Structure:
  {
    "user_secret": "ENCRYPTED_random_32_byte_salt",
    "persona_data": {
      "name": "ENCRYPTED_full_name",
      "dob": "ENCRYPTED_1990-01-15", 
      "dl_number": "ENCRYPTED_D1234567",
      "dl_expiration": "ENCRYPTED_2029-01-15",
      "address_original": "ENCRYPTED_123 E Main St Apt 5",
      "address_normalized": "ENCRYPTED_123 E MAIN ST APT 5 LOS ANGELES CA 90001"
    },
    "commitment_salts": {
      "age_salt": "ENCRYPTED_random_bytes",
      "address_salt": "ENCRYPTED_random_bytes"
    }
  }
  */
  
  encryption_key_id UUID NOT NULL,
  persona_verification_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id)
);

-- 4
CREATE TABLE seller_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL REFERENCES auth_accounts(id),
  company_name TEXT NOT NULL,
  
  -- Simple API key authentication (no cryptographic keys)
  api_key_hash TEXT UNIQUE NOT NULL,
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stripe billing
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  monthly_query_limit INTEGER DEFAULT 1000,
  queries_used_this_month INTEGER DEFAULT 0,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_id)
);

-- 5
CREATE TABLE compliance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  
  -- Event identification
  verification_id TEXT UNIQUE NOT NULL, -- "VER-789"
  buyer_id UUID NOT NULL REFERENCES buyer_accounts(id),
  seller_id UUID NOT NULL REFERENCES seller_accounts(id),
  
  -- Complete compliance record (JSON blob)
  compliance_record JSONB NOT NULL,
  /* Structure matches your example:
  {
    "compliance_record": {
      "version": "AB1263-2026.1",
      "verification_id": "VER-789",
      "timestamp": "2026-01-15T14:30:22.123Z",
      
      "zkp_proofs": {
        "age_verification": {
          "proof": "groth16_proof_object_proving_age_18_plus",
          "public_signals": ["1"], // 1 = over 18, 0 = under 18  
          "circuit_hash": "sha256_of_age_verification_circuit"
        },
        "address_verification": {
          "proof": "groth16_proof_object_proving_address_match",
          "public_signals": ["1"], // 1 = match, 0 = no match
          "circuit_hash": "sha256_of_address_verification_circuit"
        }
      },
      
      "legal_compliance": {
        "dealer_id_hash": "sha256(dealer_company_name + dealer_registration_number)",
        "transaction_id_hash": "sha256(dealer_transaction_id)", 
        "ab1263_disclosure_attested": true,
        "acknowledgment_attested": true,
        "dealer_signature": "cryptographic_signature_of_attestation",
        "ca_doj_notice_version": "CA-DOJ-2025-V1"
      },
      
      "audit_trail": {
        "persona_verification_session_hash": "sha256(persona_inquiry_id)",
        "normalization_service": "USPS_API",
        "verification_method": "ZKP_GROTH16",
        "issuer_authority": "CA2ACHAIN_LLC",
        "issuer_signature": "your_company_signature_of_entire_record"
      }
    }
  }
  */
  
  -- Blockchain integration
  blockchain_status TEXT CHECK (blockchain_status IN ('pending', 'submitted', 'confirmed', 'failed')),
  polygon_tx_hash TEXT UNIQUE,
  polygon_block_number BIGINT,
  polygon_network TEXT DEFAULT 'mainnet',
  gas_used DECIMAL,
  
  -- Fast lookup indexes (extracted from JSON for performance)
  age_proof_hash TEXT NOT NULL, -- compliance_record.verifications.age_check.proof_hash
  address_proof_hash TEXT NOT NULL, -- compliance_record.verifications.address_match.proof_hash
  dealer_attestation_hash TEXT NOT NULL, -- compliance_record.verifications.legal_notice.attestation_hash
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast hash lookups
CREATE INDEX idx_compliance_events_age_proof ON compliance_events(age_proof_hash);
CREATE INDEX idx_compliance_events_address_proof ON compliance_events(address_proof_hash);
CREATE INDEX idx_compliance_events_dealer_attestation ON compliance_events(dealer_attestation_hash);

-- Updates to Buyer_accounts table
ALTER TABLE buyer_accounts ADD COLUMN quick_address_hash TEXT;
ALTER TABLE buyer_accounts ADD COLUMN quick_age_hash TEXT;
CREATE INDEX idx_buyer_quick_address ON buyer_accounts(quick_address_hash);

