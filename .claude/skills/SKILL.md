# CA2AChain - Zero-Knowledge Identity Verification for AB 1263 Compliance

## Project Vision

CA2AChain is a privacy-first identity verification service that enables California firearm accessory dealers to comply with AB 1263 (effective 2026) while protecting buyer privacy through zero-knowledge proofs and CCPA compliance.

## Core Architecture

### Business Model
- **Buyers**: Pay $2 one-time fee for lifetime verification
- **Dealers**: Monthly subscription for API access (100/1K/10K query tiers)

### Technology Stack ✅ IMPLEMENTED
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Fastify + TypeScript  
- **Database**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (subscriptions + one-time)
- **Identity**: Persona (government ID verification)
- **Email**: Resend (transactional emails)
- **ZKP**: Privado ID (Polygon network)
- **Privacy**: Supabase Vault (encrypted PII storage)

## Current Implementation Status

### ✅ COMPLETED: Backend Infrastructure
- Complete database schema with 5 core tables
- Mock services for development (Stripe, Persona, Email)
- Authentication system (magic links)
- API middleware (auth + API key validation)
- Comprehensive testing suite
- TypeScript compilation working
- Health monitoring endpoints

### 🏗️ IN PROGRESS: Core Verification Flow

### 📋 TODO: Frontend Development
- Buyer registration interface
- Dealer dashboard
- Verification status tracking
- CCPA compliance interface

## Core Data Flow

### 1. Buyer Registration ✅ BACKEND READY
```
1. Buyer pays $2 → Stripe payment processing
2. Persona verifies government ID → Extract PII
3. Generate user_secret (32-byte random)
4. Create ZKP commitments:
   - age_commitment_hash = Hash(age_18_plus + user_secret)
   - address_commitment_hash = Hash(normalized_address + user_secret)
5. Store encrypted PII in Supabase Vault
6. Record public commitments only
7. Issue Privado ID credential
```

### 2. Dealer Verification Request ✅ BACKEND READY
```
API: POST /api/verify
Headers: Authorization: Bearer ca2a_DEALER_API_KEY

Request: {
  buyer_email: "user@example.com",
  buyer_dob: "1990-01-01", 
  shipping_address: "123 E Main St",
  dealer_transaction_id: "ORDER-789",
  ab1263_disclosure_presented: true,
  acknowledgment_received: true
}

Response: {
  verification_id: "VER-789",
  age_verified: true,
  address_verified: true,
  confidence_score: 90,
  compliance_requirements: {
    mandatory_actions: [
      {
        code: "ADULT_SIG_21",
        instruction: "Ship via Adult Signature Required (21+)",
        legal_citation: "CA Civil Code § 3273.61.1(c)"
      }
    ]
  },
  blockchain_status: "pending"
}
```

### 3. CCPA Compliance ✅ BACKEND READY
- Right to Know: Audit log access via `/api/buyer/audit`
- Right to Delete: Complete data purge via `/api/buyer/delete`
- Right to Opt-Out: Account deletion (can't use service without data sharing)

## Database Schema ✅ IMPLEMENTED

### Core Tables
```sql
auth_accounts      -- Supabase auth integration
buyer_accounts     -- Buyer profiles + commitment hashes
dealer_accounts    -- Dealer profiles + subscriptions  
buyer_secrets      -- Encrypted PII vault (CCPA deletable)
compliance_events  -- Verification audit trail + blockchain
```

### Key Fields
- **buyer_accounts**: age_commitment_hash, address_commitment_hash (public)
- **buyer_secrets**: encrypted_pii, user_secret (private, deletable)
- **compliance_events**: zkp_proofs, blockchain_tx_hash (immutable)

## Zero-Knowledge Implementation

### Commitment Hashes ✅ SCHEMA READY
```javascript
// Age verification (no DOB revealed)
age_commitment_hash = sha256(`${age_18_plus}:${user_secret}:AGE_SALT`)

// Address verification (no address revealed)  
address_commitment_hash = sha256(`${address_match}:${user_secret}:ADDR_SALT`)

// Dealer attestation (AB 1263 compliance)
dealer_attestation_hash = sha256(`DEALER:${dealer_id}:NOTICE:${version}:CONFIRMED`)
```

### Court Verification
```javascript
// Blockchain record proves verification occurred
// ZKP proofs remain valid even if buyer deletes data
// Court gets: "Proofs valid, user exercised CCPA rights"
```

## AB 1263 Compliance ✅ BACKEND READY

### Required Actions (Auto-Generated)
- **ADULT_SIG_21**: Adult signature required for 21+
- **BOX_LABELING**: Package labeling requirements  
- **AGE_VERIFICATION**: Age verification documentation
- **CA_RESIDENT_ONLY**: California residency verification

### Legal Citations Included
Every compliance requirement includes:
- Legal statute reference
- Specific instruction text  
- Penalty for non-compliance

## Privacy Architecture

### Data Separation ✅ IMPLEMENTED
- **Public**: Commitment hashes, verification results
- **Encrypted**: PII in Supabase Vault (deletable)
- **Immutable**: ZKP proofs on Polygon blockchain

### CCPA Rights ✅ BACKEND READY
- **Transparency**: Clear privacy notices at registration
- **Access**: Audit log via API endpoints
- **Deletion**: 30-day compliance process
- **Portability**: Data export functionality

## Development Environment ✅ WORKING

### Mock Services Active
- 🧪 Stripe: Payment simulation (3 subscription tiers)
- 🧪 Persona: Identity verification simulation  
- 🧪 Email: Message logging (no actual sending)

### Backend Status
- ✅ Health check: `curl http://localhost:3001/health`
- ✅ Database: Supabase connected ("REAL")
- ✅ Authentication: Magic link auth working
- ✅ API Routes: All endpoints responding

## Next Development Priorities

1. **Frontend Development**
   - Buyer registration flow
   - Dealer dashboard interface
   - Verification status tracking

2. **ZKP Integration**
   - Privado ID circuit implementation
   - Polygon blockchain integration
   - Court-ready proof verification

3. **Production Services**
   - Real Stripe integration
   - Real Persona integration  
   - Real email service

## File Organization ✅ CURRENT STRUCTURE

```
ca2achain-app/
├── backend/                 # Node.js API (✅ Complete)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic + mocks
│   │   └── middleware/     # Auth + validation
│   └── test/               # Comprehensive test suite
├── packages/shared/        # TypeScript schemas
├── frontend/               # React app (📋 TODO)
└── supabase/              # Database migrations (✅ Complete)
```

## Key Implementation Details

### Address Normalization ✅ SCHEMA READY
- USPS normalization service integration planned
- Levenshtein/Jaro-Winkler distance for fuzzy matching
- Stores both original and normalized addresses

### Blockchain Integration 🏗️ IN PROGRESS
- Privado ID for ZKP generation
- Polygon network for immutable records
- Court-verifiable proof system

### API Security ✅ IMPLEMENTED
- API key authentication for dealers
- Rate limiting by subscription tier
- Request/response logging for compliance

This skill document should be referenced whenever working on CA2AChain to maintain consistency with the privacy-first, compliance-focused architecture and zero-knowledge verification approach.