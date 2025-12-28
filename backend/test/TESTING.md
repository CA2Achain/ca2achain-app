# CA2AChain Backend Testing

## Quick Start Testing

### 1. Prerequisites Check
```bash
# Run the startup test to verify configuration
node startup-test.js
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
nano .env  # or your preferred editor
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
1. Go to your Supabase project
2. Run the migration file: `supabase/migrations/20250101000000_ca2achain_complete_schema.sql`
3. Verify with: `supabase/test_migration.sql`

### 5. Start the Backend
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build && npm start
```

### 6. Run Full Tests
```bash
# In a separate terminal, run the test suite
node test-backend.js
```

## Expected Test Results

### ✅ Successful Test Output:
```
=============================================================
🚀 CA2AChain Backend Test Suite
=============================================================

=============================================================
1. BASIC CONNECTIVITY
=============================================================
✅ PASS Health check endpoint
   Service: CA2AChain API
✅ PASS API info endpoint
   Version: 1.0.0

=============================================================
2. DATABASE CONNECTIVITY
=============================================================
✅ PASS Database connection (auth endpoint)
   Database accessible via auth routes

=============================================================
3. SCHEMA VALIDATION
=============================================================
✅ PASS Input validation (Zod schemas)
   Schema validation working

=============================================================
4. AUTHENTICATION MIDDLEWARE
=============================================================
✅ PASS Auth middleware protection
   Protected routes require authentication
✅ PASS API key middleware protection
   API routes require valid API key

=============================================================
5. ROUTE STRUCTURE
=============================================================
✅ PASS Route POST /api/auth/login
   Status: 400
✅ PASS Route GET /api/buyer/status
   Status: 401
✅ PASS Route GET /api/dealer/dashboard
   Status: 401
✅ PASS Route POST /api/verify
   Status: 401
✅ PASS Route POST /webhooks/stripe
   Status: 400

=============================================================
6. CONFIGURATION
=============================================================
✅ PASS Environment variable SUPABASE_URL
   ✓ Set
✅ PASS Environment variable SUPABASE_SERVICE_ROLE_KEY
   ✓ Set
✅ PASS Environment variable STRIPE_SECRET_KEY
   ✓ Set
✅ PASS Environment variable RESEND_API_KEY
   ✓ Set
✅ PASS Environment variable ENCRYPTION_KEY
   ✓ Set
✅ PASS Environment variable FRONTEND_URL
   ✓ Set

=============================================================
7. SERVICE INTEGRATION TESTS
=============================================================
✅ PASS Encryption service
   Encrypt/decrypt working
✅ PASS API key generation
   API key format valid

=============================================================
📊 TEST RESULTS SUMMARY
=============================================================
Total Tests: 17
Passed: 17
Failed: 0
Pass Rate: 100.0%

🎉 ALL TESTS PASSED! Backend is ready for production.
```

## Manual API Testing

### Test Authentication (Magic Link)
```bash
# Request magic link
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","account_type":"buyer"}'

# Should return: {"success":true,"message":"Magic link sent to your email"}
```

### Test API Key Protection
```bash
# Test verification endpoint (should fail without API key)
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_email":"buyer@example.com",
    "buyer_dob":"1990-01-01",
    "shipping_address":"123 Main St, Los Angeles, CA 90001",
    "transaction_id":"TEST-123",
    "ab1263_disclosure_presented":true,
    "acknowledgment_received":true
  }'

# Should return: {"success":false,"error":"Missing or invalid authorization header"}
```

### Test Health and Info Endpoints
```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api
```

## Troubleshooting Common Issues

### ❌ Database Connection Failed
- **Check:** Supabase URL and service role key in .env
- **Fix:** Verify credentials in Supabase dashboard
- **Test:** Run migration script in Supabase SQL editor

### ❌ Schema Validation Failed  
- **Check:** TypeScript compilation errors
- **Fix:** Run `npx tsc --noEmit` to see specific errors
- **Update:** Ensure @ca2achain/shared package is properly linked

### ❌ Environment Variables Missing
- **Check:** .env file exists and has all required variables
- **Fix:** Copy .env.example to .env and fill in values
- **Generate:** Encryption key with `openssl rand -hex 32`

### ❌ Routes Not Found
- **Check:** Server startup logs for errors
- **Fix:** Ensure all route files are properly exported
- **Verify:** TypeScript imports are using correct file extensions (.js)

### ❌ Service Integration Failed
- **Check:** External API keys (Stripe, Resend, Persona)
- **Fix:** Verify keys are valid and have correct permissions
- **Test:** Check service endpoints individually

## Performance Testing

### Load Testing (Optional)
```bash
# Install autocannon for load testing
npm install -g autocannon

# Test health endpoint
autocannon -c 10 -d 10 http://localhost:3001/health

# Test auth endpoint
autocannon -c 5 -d 10 -m POST \
  -H "Content-Type: application/json" \
  -b '{"email":"test@example.com"}' \
  http://localhost:3001/api/auth/login
```

## Security Testing

### API Key Testing
1. Generate test dealer account with API key
2. Test all verification endpoints with valid/invalid keys
3. Verify rate limiting and query quotas work

### Input Validation Testing
1. Test malformed JSON inputs
2. Test SQL injection attempts 
3. Test XSS attempts in string fields
4. Verify all Zod schemas reject invalid data

## Production Checklist

Before deploying to production:

- [ ] All tests pass with 100% success rate
- [ ] Environment variables set for production
- [ ] Database migration run on production Supabase
- [ ] Stripe configured with production keys
- [ ] Domain and CORS configured correctly
- [ ] SSL/HTTPS enabled
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

## Support

If you encounter issues:

1. Check the test output for specific error details
2. Review the troubleshooting section above
3. Verify all environment variables are correctly set
4. Check Supabase and external service status pages
5. Review server logs for detailed error messages

The backend is designed to be robust and provide clear error messages to help with debugging.