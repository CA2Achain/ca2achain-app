# Supabase Setup Instructions - CA2AChain

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region (preferably California for CCPA compliance)
4. Set database password (save this securely)
5. Wait for project initialization (~2 minutes)

## 2. Get API Keys

1. Go to Project Settings > API
2. Copy these values to your `.env` file:
   - `Project URL` → `SUPABASE_URL`
   - `anon/public key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 3. Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `migrations/20250101000000_ca2achain_complete_schema.sql`
4. Paste and click "Run"
5. Verify success - should see "Success" message

### Option B: Using Supabase CLI (For later)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## 4. Verify Schema Installation

Run this query in SQL Editor to verify all tables were created:

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- auth_accounts
- buyer_accounts  
- buyer_secrets
- compliance_events
- dealer_accounts

## 5. Configure Authentication

1. Go to Authentication > Providers
2. Enable **Email** provider
3. **Disable** all other providers (Google, GitHub, etc.) unless needed
4. Go to Authentication > Email Templates
5. Customize "Magic Link" template:

```html
<h2>Welcome to CA2AChain</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>If you didn't request this, please ignore this email.</p>
```

## 6. Configure Custom SMTP (Production)

For production, configure Resend SMTP:
1. Go to Project Settings > Auth
2. Enable "Use Custom SMTP"
3. SMTP Settings:
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** Your Resend API key
   - **Sender name:** `CA2AChain`
   - **Sender email:** `noreply@yourdomain.com`

## 7. Test Database Functions

Run these test queries to verify functions work:

```sql
-- Test buyer audit log function
SELECT * FROM get_buyer_audit_logs('00000000-0000-0000-0000-000000000000');

-- Test dealer query limit check
SELECT can_dealer_query('00000000-0000-0000-0000-000000000000');

-- Test query count increment
SELECT increment_dealer_query_count('00000000-0000-0000-0000-000000000000');
```

## 8. Set Up Row Level Security Verification

Test RLS is working by trying to access data without proper authentication:

```sql
-- This should return no results (RLS blocking)
SET role anon;
SELECT * FROM buyer_secrets;

-- Reset to authenticated role
RESET role;
```

## 9. Environment Variables Setup

Create your backend `.env` file with Supabase credentials:

```bash
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Other required variables (placeholders for now)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
PERSONA_API_KEY=persona_sandbox_placeholder
PERSONA_TEMPLATE_ID=itmpl_placeholder
PRIVADO_ISSUER_DID=did:polygonid:polygon:mumbai:placeholder
PRIVADO_ISSUER_PRIVATE_KEY=placeholder
PRIVADO_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/placeholder
PRIVADO_SCHEMA_HASH=placeholder
RESEND_API_KEY=re_placeholder
ENCRYPTION_KEY=12345678901234567890123456789012
FRONTEND_URL=http://localhost:3000
```

## 10. Test Backend Connection

Start your backend server and test the health endpoint:

```bash
cd backend
pnpm dev

# In another terminal:
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## 11. Security Checklist

Before going to production:

- [ ] Service role key is only on server (never in frontend)
- [ ] RLS policies are enabled and tested
- [ ] Database backups enabled (Project Settings > Database > Backups)
- [ ] API keys stored in environment variables only
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified
- [ ] Firewall rules configured if needed

## 12. Monitoring & Maintenance

Set up monitoring:
1. Go to Project Settings > Integrations
2. Enable any desired monitoring tools
3. Set up alerts for:
   - High query usage
   - Failed authentication attempts
   - Storage usage approaching limits

## Notes

- **Free tier limits:** 500MB database, 50,000 monthly active users
- **Upgrade trigger:** When you hit limits or need more performance
- **Pricing:** Pro plan starts at $25/month
- **Backup retention:** 7 days on free tier, 30 days on Pro