# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region (preferably California for CCPA compliance)
4. Set database password (save this securely)

## 2. Get API Keys

1. Go to Project Settings > API
2. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon/public key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 3. Run Database Migration

### Option A: Using Supabase Dashboard (Recommended for now)

1. Go to SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `migrations/20240101000000_initial_schema.sql`
4. Paste and click "Run"

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

## 4. Configure Auth Settings

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates:
   - Go to Authentication > Email Templates
   - Customize "Magic Link" template with your branding

## 5. Configure Email Settings (Optional)

For production, configure custom SMTP:
1. Go to Project Settings > Auth
2. Enable "Enable Custom SMTP"
3. Use Resend SMTP settings:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: Your Resend API key

## 6. Set up Storage (Optional - for future use)

If you want to store DL images from Persona:
1. Go to Storage
2. Create bucket named `verification-documents`
3. Set security policies

## 7. Verify Installation

Run this query in SQL Editor to verify tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- users
- pii_vault
- customers
- audit_logs

## 8. Test Auth Flow

1. In your backend, set the environment variables
2. Start backend server
3. Try `/api/auth/login` endpoint with an email
4. Check Supabase Auth > Users to see the user created

## 9. Security Checklist

- [ ] Service role key is NOT in frontend code
- [ ] RLS policies are enabled on all tables
- [ ] API keys are in environment variables, not committed to git
- [ ] Database backups are enabled (Project Settings > Database > Backups)

## Notes

- Free tier: 500MB database, 50,000 monthly active users
- Upgrade to Pro ($25/mo) when you need more
- California region recommended for CCPA compliance