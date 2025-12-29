# CA2AChain

Identity-as-a-Service platform for CCPA-compliant age and identity verification.

## Project Structure

```
ca2achain-app/
├── backend/                 # Node.js + Fastify API server
├── packages/shared/         # Shared TypeScript schemas  
├── supabase/               # Database migrations and config
├── frontend/               # React frontend
│   └── src/
│       ├── legal/          # 📜 Human-readable legal content
│       │   ├── privacy-policy.md
│       │   ├── terms-of-service.md
│       │   ├── consent-forms.md
│       │   └── README.md
│       └── types/
│           └── legal.ts    # TypeScript consent interfaces
└── docs/                   # Additional documentation
```

## Tech Stack

- **Frontend**: Next.js
- **Backend**: Fastify, Supabase (Auth + Database)
- **Identity**: Privado ID (Polygon ID) - Zero-Knowledge Proofs
- **Services**: Persona (KYC), Stripe (Payments), Resend (Email)
- **Hosting**: Render

## Setup

### Backend

```bash
cd backend
pnpm install
cp .env.example .env
# Configure environment variables
pnpm dev
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env
# Configure environment variables
pnpm dev
```

## Environment Variables

See `.env.example` files in backend and frontend directories.

## Architecture

1. User registers with email (Supabase Auth magic link)
2. User uploads driver's license (Persona verification)
3. Backend issues Polygon ID credential with claims
4. Backend encrypts and stores credential in Supabase
5. Third parties verify via API (ZKP verification on backend)
6. No crypto wallets required - fully abstracted

## Legal Compliance

CA2AChain is designed to comply with:

- **California AB 1263** - Firearm accessory age/address verification
- **California Consumer Privacy Act (CCPA)** - Privacy rights and data protection  
- **Zero-Knowledge Privacy** - Blockchain proofs with no personal data
- **Court-Defensible Audits** - Immutable verification records

See `/legal/` directory for complete legal documentation including privacy policy, terms of service, and compliance checklists.