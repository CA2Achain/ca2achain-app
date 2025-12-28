# CA2AChain

Identity-as-a-Service platform for CCPA-compliant age and identity verification.

## Tech Stack

- **Frontend**: Next.js
- **Backend**: Fastify, Supabase (Auth + Database)
- **Identity**: Privado ID (Polygon ID) - Zero-Knowledge Proofs
- **Services**: Persona (KYC), Stripe (Payments), Resend (Email)
- **Hosting**: Render

Core Infrastructure

Database: Supabase (Postgres + RLS + Vault encryption)
Backend: Fastify (Node.js REST API)
Blockchain: Polygon (immutable audit trail)
Identity: Privado ID/Polygon ID (zero-knowledge proofs)
KYC: Persona (driver's license verification)
Address Normalization: USPS Address API (or SmartyStreets/Melissa Data)
Payments: Stripe (dealer subscriptions)

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