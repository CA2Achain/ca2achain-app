## CA2ACHAIN Blockchain Hash Specification v1.0

### Age Commitment Hash
```javascript
const ageCommitment = {
  zkp_age_proof: privado_age_proof,
  buyer_reference: "BUY_a8b9c2d1", 
  buyer_secret: buyer_uuid_hash,
  age_verified: true,
  verified_at_timestamp: ISO_timestamp
};
AgeCommitment_Hash = SHA256(JSON.stringify(ageCommitment));
```

### Address Match Commitment Hash  
```javascript
const addressMatchCommitment = {
  zkp_address_proof: privado_address_proof,
  buyer_reference: "BUY_a8b9c2d1",
  normalized_buyer_address: normalize(buyer_address),
  dealer_reference: "DLR_f3e4d5c6", 
  normalized_shipping_address: normalize(dealer_provided_address),
  match_confidence: 1.0,
  address_match_verified: true,
  verified_at_timestamp: ISO_timestamp
};
Address_Match_Commitment_Hash = SHA256(JSON.stringify(addressMatchCommitment));
```

### Dealer Notice Attestation Hash
```javascript
const noticeAttestation = {
  dealer_reference: "DLR_f3e4d5c6",
  notice_version: "CA-DOJ-2026-V1", 
  ab1263_dealer_received_buyer_acceptance: true,
  buyer_reference: "BUY_a8b9c2d1",
  verification_timestamp: ISO_timestamp
};
Dealer_Attestation_Hash = SHA256(JSON.stringify(noticeAttestation));
```

### Transaction Link Hash
```javascript
const transactionLink = {
  compliance_event_id: compliance_event_uuid,
  buyer_reference: "BUY_a8b9c2d1",
  dealer_reference: "DLR_f3e4d5c6"
};
Transaction_Link_Hash = SHA256(JSON.stringify(transactionLink));
```

### Purpose
Provides cryptographic non-repudiation for AB 1263 compliance verification using Zero-Knowledge Proofs and blockchain immutability for court audit purposes.

## Build packages

```
pnpm run build
```