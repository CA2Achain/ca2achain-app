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