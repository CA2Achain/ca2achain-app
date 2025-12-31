# CA2ACHAIN API Testing Plan - Postman Manual Tests
**Identity-as-a-Service Platform | ZKP Verification & AB1263 Compliance**

## 🎯 Testing Strategy

### **Objective**
Systematically test all endpoints of the CA2ACHAIN identity verification platform to ensure:
- Core business workflows function correctly
- Authentication and authorization work properly  
- Data validation and error handling behave as expected
- ZKP verification processes complete successfully
- AB1263 compliance features operate correctly

### **Testing Approach**
- **Manual execution** with Postman
- **Reproducible tests** with documented payloads
- **Workflow-based testing** (authentication → registration → verification)
- **Real Supabase** database with **mock external services** (Stripe, Persona)

---

## 🔧 Environment Setup

### **Base Configuration**
```
Environment: Development
Base URL: http://localhost:3001
Database: Supabase (REAL)
External Services: Mock (Stripe, Persona, Resend)
```

### **Postman Environment Variables**
```
BASE_URL: http://localhost:3001
BUYER_EMAIL: test.buyer@example.com
DEALER_EMAIL: test.dealer@example.com
BUYER_AUTH_TOKEN: {{to_be_set_from_auth_response}}
DEALER_AUTH_TOKEN: {{to_be_set_from_auth_response}}  
DEALER_API_KEY: {{to_be_set_from_dealer_response}}
VERIFICATION_ID: {{to_be_set_from_verification_response}}
INQUIRY_ID: {{to_be_set_from_persona_response}}
```

---

## 📋 Test Categories & Priority

### **Priority 1: Core Infrastructure** ⭐⭐⭐
- Health checks
- Authentication flows
- Basic CRUD operations

### **Priority 2: Business Workflows** ⭐⭐
- Buyer registration & verification
- Dealer setup & credit management
- Identity verification API

### **Priority 3: Advanced Features** ⭐
- Payment processing
- Webhook handling
- Error scenarios

---

## 🧪 Test Suite Structure

### **1. HEALTH & STATUS (Priority 1)**

#### **1.1 Health Check**
```http
GET {{BASE_URL}}/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "service": "ca2achain-api"
}
```
**Test Status:** [X] Pass [ ] Fail  
**Notes:**

#### **1.2 System Status**
```http
GET {{BASE_URL}}/status
```
**Expected Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "environment": "development"
}
```
**Test Status:** [X] Pass [ ] Fail  
**Notes:**

---

### **2. AUTHENTICATION (Priority 1)**

#### **2.1 Buyer Magic Link Request**
```http
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "{{BUYER_EMAIL}}",
  "account_type": "buyer"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Magic link sent to test.buyer@example.com"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **2.2 Dealer Magic Link Request**
```http
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "{{DEALER_EMAIL}}",
  "account_type": "dealer"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Magic link sent to test.dealer@example.com"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **2.3 Auth Callback (Mock)**
```http
POST {{BASE_URL}}/auth/callback
Content-Type: application/json

{
  "token": "mock_magic_link_token",
  "account_type": "buyer"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "test.buyer@example.com"
    }
  }
}
```
**Action:** Save `access_token` to `BUYER_AUTH_TOKEN` environment variable  
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### **3. BUYER WORKFLOWS (Priority 2)**

#### **3.1 Buyer Registration**
```http
POST {{BASE_URL}}/buyer/register
Authorization: Bearer {{BUYER_AUTH_TOKEN}}
Content-Type: application/json

{
  "first_name": "Test",
  "last_name": "Buyer",
  "phone": "5551234567"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "Test",
    "last_name": "Buyer",
    "verification_status": "pending",
    "buyer_reference_id": "BUY_xxxxxxxx"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **3.2 Start Identity Verification**
```http
POST {{BASE_URL}}/buyer/verify-identity
Authorization: Bearer {{BUYER_AUTH_TOKEN}}
Content-Type: application/json

{}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "inquiry_id": "persona_inquiry_id",
    "session_token": "persona_session_token",
    "verification_url": "https://withpersona.com/..."
  }
}
```
**Action:** Save `inquiry_id` to `INQUIRY_ID` environment variable  
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **3.3 Get Buyer Profile**
```http
GET {{BASE_URL}}/buyer/profile
Authorization: Bearer {{BUYER_AUTH_TOKEN}}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "Test",
    "verification_status": "pending",
    "payment_status": "pending"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **3.4 Get Verification Status**
```http
GET {{BASE_URL}}/buyer/verification-status
Authorization: Bearer {{BUYER_AUTH_TOKEN}}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "verification_status": "pending",
    "inquiry_id": "persona_inquiry_id",
    "last_updated": "2025-01-01T00:00:00.000Z"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### **4. DEALER WORKFLOWS (Priority 2)**

#### **4.1 Get Dealer Profile**
```http
GET {{BASE_URL}}/dealer/profile
Authorization: Bearer {{DEALER_AUTH_TOKEN}}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_name": "Test Company",
    "dealer_reference_id": "DLR_xxxxxxxx",
    "verification_credits": 0,
    "api_key": "ca2a_xxxxxxxx"
  }
}
```
**Action:** Save `api_key` to `DEALER_API_KEY` environment variable  
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **4.2 Generate API Key**
```http
POST {{BASE_URL}}/dealer/generate-api-key
Authorization: Bearer {{DEALER_AUTH_TOKEN}}
Content-Type: application/json

{
  "name": "Test API Key"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "api_key": "ca2a_xxxxxxxx",
    "name": "Test API Key",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### **5. VERIFICATION API (Priority 2) - Core Business Logic**

#### **5.1 Identity Verification Request**
```http
POST {{BASE_URL}}/verify
X-API-Key: {{DEALER_API_KEY}}
Content-Type: application/json

{
  "buyer_email": "{{BUYER_EMAIL}}",
  "shipping_address": "123 Main St, Los Angeles, CA 90210",
  "ab1263_compliance_completed": true
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "verification_id": "uuid",
    "age_verified": true,
    "address_verified": true,
    "address_match_confidence": 0.95,
    "zkp_proof_hashes": {
      "age_proof": "hash123",
      "address_proof": "hash456"
    },
    "compliance_event_id": "uuid",
    "blockchain_transaction_hash": "0xabc123...",
    "verified_at": "2025-01-01T00:00:00.000Z"
  }
}
```
**Action:** Save `verification_id` to `VERIFICATION_ID` environment variable  
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **5.2 Get Verification Details**
```http
GET {{BASE_URL}}/verify/{{VERIFICATION_ID}}
X-API-Key: {{DEALER_API_KEY}}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "verification_id": "uuid",
    "age_verified": true,
    "address_verified": true,
    "compliance_event_id": "uuid",
    "verified_at": "2025-01-01T00:00:00.000Z"
  }
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **5.3 Get Verification History**
```http
GET {{BASE_URL}}/verify/history?limit=10&offset=0
X-API-Key: {{DEALER_API_KEY}}
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "verification_id": "uuid",
      "age_verified": true,
      "address_verified": true,
      "verified_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### **6. ERROR SCENARIOS (Priority 3)**

#### **6.1 Unauthorized Request**
```http
GET {{BASE_URL}}/buyer/profile
```
**Expected Response:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **6.2 Invalid API Key**
```http
POST {{BASE_URL}}/verify
X-API-Key: invalid_key
Content-Type: application/json

{
  "buyer_email": "test@example.com",
  "shipping_address": "123 Test St",
  "ab1263_compliance_completed": true
}
```
**Expected Response:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

#### **6.3 Validation Error**
```http
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "invalid-email",
  "account_type": "invalid"
}
```
**Expected Response:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid request data"
}
```
**Test Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 📊 Test Execution Tracking

### **Test Summary**
- **Total Tests:** 18
- **Priority 1 (Critical):** 6 tests
- **Priority 2 (Important):** 9 tests  
- **Priority 3 (Nice-to-have):** 3 tests

### **Execution Log**
| Date | Tester | Tests Passed | Tests Failed | Notes |
|------|--------|--------------|--------------|-------|
| 2025-01-01 | | 0/18 | 0/18 | Initial setup |

### **Known Issues**
| Issue | Priority | Status | Resolution |
|-------|----------|--------|------------|
| | | | |

### **Next Steps**
1. [ ] Execute Priority 1 tests first
2. [ ] Set up proper authentication tokens
3. [ ] Test core verification workflow
4. [ ] Document any issues found
5. [ ] Create bug reports for failures

---

## 💡 Testing Tips

### **Before Starting**
- Ensure backend server is running (`pnpm dev`)
- Verify all mock services are initialized
- Check Supabase database connection

### **During Testing**
- Save tokens and IDs to environment variables as you progress
- Test workflows in sequence (auth → register → verify)
- Document actual responses vs expected responses
- Note any console errors in the backend logs

### **After Testing**
- Update test status checkboxes
- Document any deviations from expected behavior
- Create issues for failures that need code fixes
- Update environment variables for future test runs