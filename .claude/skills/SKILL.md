### Goals

#### Use-case Flow

User uploads DL → You verify with Persona (allowed for internal use)
YOU issue Polygon ID credential (you become the "Issuer")
Store credential in your Supabase vault (user doesn't need wallet)
Third party queries → You generate ZKP from stored credential
  
Third parties call your REST API. You handle all Polygon ID ZKP verification internally. They get simple JSON responses: { verified: true }.

### Checklist for CCPA

What You MUST Implement:

Clear Privacy Notice (at registration)

"Your data will be shared with third parties for verification"
List categories of third parties
Explain they can delete data anytime

Required CCPA Rights:

Right to Know: Audit log access ✅
Right to Delete: Purge from database ✅
Right to Opt-Out: Delete account (can't use service without sharing) ✅

Technical Safeguards (already in your design):

Encryption at rest (Supabase Vault) ✅
Access logging (audit table) ✅
Secure authentication (Privy) ✅

Operational:

Privacy policy with CCPA disclosures ✅
Data Processing Agreements with vendors ✅
30-day deletion compliance process ✅

### AB 1263

 Please review the 2026 law going into effect AB 1263 regarding identification age and address requirements when purchasing firearm accessories online. I want to sign up buyer users who just have to sign up one time, I generate and keep a secret key for every buyer user, i am not sure if this is what you mean by shadow wallet, and encrypt their address, date of birth, dmv issued ID, and other personal private data. Dealer clients can use my identity as a service to send me the information provided to them by the buyer user, such as date of birth, drivers license, address, have the buyer user accept a disclaimer as specified by California law, and call my REST service to verify the buyer user's data without me revealing that information. To do this I will use Supabase secrets, Supabase, Polygon ID, and log events on Polygon blockchain. This is to have a solid system that avoids liability pursuant AB 1263 and related California firearms and privacy CCPA laws. Hashes will be recorded to Polygon  to prove undeniable records if needed in court, however Supabase should also keep records if needed more accessibly for buyer client requests.  Addresses should also be normalized due to small differences in syntax such as E vs East or St vs Street. Addresses, being private, will be stored encrypted with the user's private key. Verification of the address will normalize the address received from the dealer client and hashed and compared, if it does not match, then I will use the key I keep on behalf of the buyer user to decrypt their address and verify using Levenstein Distance or Jaro-Winkler. I will use a address normalizing service such as the one provided by USPS or other service balancing both budget and accuracy. 

### Summary

#### Hashing algorithms

Age Commitment Hash
function generateAgeCommitmentHash(dob, userSecret) {
  const age = calculateAge(dob);
  const ageProof = age >= 18 ? "LEGAL_AGE_VERIFIED" : "UNDERAGE";
  return sha256(`${ageProof}:${userSecret}:AGE_SALT_${Date.now()}`);
}

Address Commitment Hash
function generateAddressCommitmentHash(normalizedIdAddress, shippingAddress, userSecret) {
  const normalizedShipping = normalizeAddress(shippingAddress);
  const addressMatch = normalizedIdAddress === normalizedShipping ? "MATCH" : "NO_MATCH";
  return sha256(`${addressMatch}:${userSecret}:ADDR_SALT_${Date.now()}`);
}

Dealer Attestation Hash
function generateDealerAttestationHash(dealerId, noticeVersion, attestation) {
  return sha256(`DEALER:${dealerId}:NOTICE:${noticeVersion}:CONFIRMED:${attestation}`);
}

Order Hash
function computeOrderHash(dealerTransactionId, buyerEmail, shippingAddress, timestamp) {
  const orderData = {
    dealer_transaction_id: dealerTransactionId,
    buyer_email: buyerEmail,
    shipping_address_normalized: normalizeAddress(shippingAddress),
    timestamp: timestamp,
    schema_version: "AB1263-2026.1"
  };
  
  // Deterministic JSON stringify (keys sorted)
  const canonicalOrder = JSON.stringify(orderData, Object.keys(orderData).sort());
  return sha256(canonicalOrder);
}

#### Audit logging

// Court order: "Prove this ZKP was valid"
async function proveZKPForCourt(verificationId) {
  const record = await getBlockchainRecord(verificationId);
  const secrets = await decryptBuyerSecrets(buyerId); // Only if buyer hasn't deleted
  
  // Regenerate the same proof with same inputs
  const age_proof = await generateAgeProof(secrets.dob, secrets.user_secret);
  const address_proof = await generateAddressProof(secrets.id_address, shipping_address, secrets.user_secret);
  
  return {
    "Blockchain record": record,
    "Proof verification": {
      "Age proof valid": verifyProof(record.zkp_proofs.age_verification.proof),
      "Address proof valid": verifyProof(record.zkp_proofs.address_verification.proof)
    },
    "Data available": secrets !== null ? "Yes" : "User deleted (CCPA compliance)"
  };
}
```

**If user deleted their data:** Court still has immutable blockchain record with cryptographically verified proofs. The proofs themselves prove the facts without needing to reproduce them.

**Technical Architecture:**
```
Registration:
1. Persona verifies ID → Extract PII
2. Generate ZKP circuits for age/address
3. Create Groth16 proofs
4. Store proofs + public signals on blockchain
5. Encrypt PII in Supabase (deletable per CCPA)

Verification:  
1. Seller API call → Simple HTTP request
2. Generate new ZKP proofs for this transaction
3. Store full compliance record on blockchain
4. Return simple response to seller

Court Audit:
1. Retrieve immutable blockchain record
2. Verify ZKP proofs mathematically (always possible)
3. Show encrypted data if still available
4. If data deleted: "Proofs remain valid, user exercised CCPA rights"

## Use Case Flows

### 1. Buyer Registration Flow
```
1. Buyer pays $2 one-time fee → creates buyer_account
2. Persona verifies ID → extracts PII
3. Generate user_secret (random 32 bytes)
4. Compute ZKP commitment hashes:
   - age_commitment_hash = Hash(age_18_plus + user_secret)
   - address_commitment_hash = Hash(normalized_address + user_secret)
5. Store in buyer_accounts (public hashes only)
6. Encrypt PII + secrets → store in buyer_secrets
7. Record registration on Polygon blockchain
```

### 2. Seller Verification Request
```
1. Seller sends: {
     buyer_email: "user@example.com",
     shipping_address: "123 E Main St Apt 5",
     dealer_transaction_id: "ORDER-789",
     ab1263_disclosure_presented: true,
     dealer_signature: "cryptographic_signature"
   }

2. Backend process:
   a) Lookup buyer by email
   b) Decrypt buyer secrets to get:
      - Normalized ID address
      - DOB
      - User secret
   
   c) Compute verification hashes:
      - age_proof_hash = Hash(age_18_plus + user_secret)
      - address_proof_hash = Hash(address_match_result + user_secret)
      - dealer_attestation_hash = Hash(dealer_id + notice + "YES")
   
   d) Compare with stored commitment hashes:
      - age_proof_hash === buyer.age_commitment_hash
      - address_proof_hash computed from shipping vs ID address
   
   e) Generate compliance_record JSON blob
   f) Store in compliance_events table
   g) Submit hash to Polygon blockchain

3. Return to seller: {
     verification_id: "VER-789",
     age_verified: true,
     address_verified: true,
     proof_hashes: ["a1b2c3...", "z9y8x7..."],
     blockchain_pending: true
   }
```

### 3. Court Verification Flow
```
1. Court requests proof for verification_id "VER-789"
2. Retrieve compliance_events record
3. Decrypt buyer_secrets to show proof construction:
   - "Age proof hash a1b2c3... was created from: age=25 (>18) + user_secret"
   - "Address proof hash z9y8x7... was created from: match=EXACT + user_secret"
4. Show Polygon blockchain record with same hashes
5. Proves: Data existed at timestamp, buyer was legal age, address matched

#### Future Supabase tables

admin_users (if you have admin dashboard)
api_keys_history (if sellers rotate keys frequently)
payment_history (if you want detailed Stripe tracking)

### Project Structure Outline

```
/home/claude/idverify-saas/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── verify/
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── StripeIdentityWidget.tsx
│   │   │   └── PrivyAuthProvider.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── verification.ts
│   │   │   └── webhooks.ts
│   │   ├── services/
│   │   │   ├── stripe.service.ts
│   │   │   ├── supabase.service.ts
│   │   │   ├── encryption.service.ts
│   │   │   └── email.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── apikey.middleware.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .env.local
└── README.md
```