# Backend Refactor Plan - Phase 1: Core Foundation

## Context
- **Project:** CA2ACHAIN SAAS - Driver's license verification with ZKP/blockchain
- **Current State:** Monolithic 665-line supabase.ts service, scattered schema usage
- **Goal:** Modular, swagger-compatible backend aligned with new shared schemas

## New Shared Schema Modules
```
@ca2achain/shared:
├── buyer/           (account management)
├── buyer-secrets/   (encrypted PII & ZKP) ← NEW MODULE
├── dealer/          (SaaS billing, credits)
├── payments/        (removed created_at, buyer_id/dealer_id)
├── verification/    (hash reproducibility)
└── common/          (phone, DOB, payment status)
```

## Database Changes Applied
- **payments:** Removed `created_at`, proper buyer/dealer foreign keys
- **dealer_accounts:** `business_address` now JSONB
- **buyer_secrets:** Stores encrypted persona data + privado credentials for hash reproducibility
- **RLS enabled:** All tables secured with row-level security

## Current Backend Structure (What We Have)
```
backend/src/
├── services/
│   ├── supabase.ts      (665 lines) ← SPLIT THIS FIRST
│   ├── encryption.ts    (117 lines) ← UPDATE SCHEMAS
│   ├── auth.ts         (104 lines) ← UPDATE SCHEMAS
│   └── email.ts        (135 lines) ← UPDATE SCHEMAS
├── middleware/
│   ├── auth.ts         (UPDATE: new buyer/dealer schemas)
│   └── apikey.ts       (UPDATE: dealer credit system)
├── types/
│   └── index.ts        (UPDATE: import new shared schemas)
└── routes/             (UPDATE LATER - after services)
```

## Refactor Plan: 4 Steps (Refactor First, Then Swagger)

### Step 1: Split Supabase Service (Priority)
**Split 665-line monolith into focused modules**

```
src/services/database/
├── connection.ts        (Supabase client init)
├── buyer-accounts.ts    (Buyer CRUD + reference IDs)
├── buyer-secrets.ts     (Encrypted PII operations) ← NEW
├── dealer-accounts.ts   (Dealer CRUD + credit system)
├── compliance-events.ts (Verification + blockchain)
├── payments.ts         (Payment operations - new schema)
└── index.ts            (Exports + service resolver)
```

### Step 2: Update Core Services
**Align existing services with new schemas**

- **encryption.ts:** Support buyer-secrets schema, hash reproducibility
- **auth.ts:** New buyer/dealer account schemas
- **email.ts:** Updated templates for new structures

### Step 3: Update Middleware & Types
**Schema integration and validation**

- **middleware/auth.ts:** New buyer/dealer account structures
- **middleware/apikey.ts:** Dealer credit system integration
- **types/index.ts:** Import all new shared schemas

### Step 4: Service Integration
**Connect split services and test**

- Update service-resolver.ts
- Update imports across routes
- Test service initialization

## After Refactor: Then Add Swagger
- Add swagger dependencies
- Create OpenAPI schemas
- Add route decorations
- Generate API documentation

## Key Integration Points

### Buyer-Secrets Integration
```typescript
// Hash reproducibility for verification
const hashData = await extractBuyerHashData(buyer_id, compliance_event_id);
// Uses: dateOfBirth + normalized_address from encrypted_persona_data
```

### Dealer Credit System
```typescript
// SaaS billing with credit management
const hasCredits = await dealer_has_credits(dealer_uuid);
const success = await use_dealer_credit(dealer_uuid);
```

### Payment Schema Updates
```typescript
// New payment structure (no created_at, proper foreign keys)
const payment = {
  buyer_id: uuid | null,
  dealer_id: uuid | null,
  payment_provider_info: { // Combined credit card + stripe info
    credit_card_info: {...},
    stripe_info: {...},
    stripe_payment_intent_id: "pi_..." // For refunds
  }
}
```

## Success Criteria
- [x] Database migration applied
- [x] Shared schemas updated
- [ ] Supabase service split into focused modules
- [ ] Core services updated for new schemas
- [ ] Middleware updated for new structures
- [ ] All services integrated and tested
- [ ] Swagger documentation added

## Next Phase
After core foundation: Update routes (buyer.ts, dealer.ts, verification.ts) for complete workflow integration.