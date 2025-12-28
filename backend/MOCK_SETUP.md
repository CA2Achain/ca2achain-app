# Mock Services Setup

## Files Available

```
backend/
├── test/test-mocks.js                 # Mock services test script
├── src/services/mocks/stripe.ts       # Mock Stripe (224 lines)
├── src/services/mocks/persona.ts      # Mock Persona (167 lines)
└── src/services/service-resolver.ts   # Auto real/mock switching
```

## Quick Test

```bash
# Test mock services (no API keys needed)
npm run test:mocks

# Should output:
# 🧪 Testing Mock Services
# ✅ Created checkout session: cs_mock_12345678
# ✅ Verified payment: $2
# ✅ Created inquiry: inq_mock_12345678
# 🎉 All mock services working correctly!
```

## How It Works

- **Missing STRIPE_SECRET_KEY** → Uses Mock Stripe
- **Missing PERSONA_API_KEY** → Uses Mock Persona
- **Has real keys** → Uses real services

## Minimal .env for Testing

```bash
# Only need these 3 for mock testing:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
ENCRYPTION_KEY=your-64-char-hex-key

# Leave blank for mocks:
STRIPE_SECRET_KEY=
PERSONA_API_KEY=
```

## What Mocks Provide

### Mock Stripe
- Buyer payments ($2 verification fee)
- Dealer subscriptions (3 tiers: 100/1000/10000 queries)
- Realistic checkout URLs and payment flows

### Mock Persona  
- Auto-approving identity verification
- Realistic CA resident data (34-year-old with valid DL)
- Complete verification API simulation

## Test Commands

```bash
npm run test:mocks    # Test mocks only
npm run test:startup  # Test configuration
npm run dev          # Start server (uses mocks automatically)
npm run test         # Test complete backend
```

## Ready to Go!

Your CA2AChain backend works completely with mock services - no external accounts needed for development!