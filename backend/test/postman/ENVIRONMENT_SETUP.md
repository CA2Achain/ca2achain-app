# Postman Environment Setup - CA2ACHAIN API

## Quick Environment Configuration

Import these variables into your Postman environment:

```json
{
  "id": "ca2achain-dev-environment",
  "name": "CA2ACHAIN Development",
  "values": [
    {
      "key": "BASE_URL",
      "value": "http://localhost:3001",
      "enabled": true
    },
    {
      "key": "BUYER_EMAIL", 
      "value": "test.buyer@example.com",
      "enabled": true
    },
    {
      "key": "DEALER_EMAIL",
      "value": "test.dealer@example.com", 
      "enabled": true
    },
    {
      "key": "BUYER_AUTH_TOKEN",
      "value": "",
      "enabled": true
    },
    {
      "key": "DEALER_AUTH_TOKEN",
      "value": "",
      "enabled": true
    },
    {
      "key": "DEALER_API_KEY",
      "value": "",
      "enabled": true
    },
    {
      "key": "VERIFICATION_ID",
      "value": "",
      "enabled": true
    },
    {
      "key": "INQUIRY_ID",
      "value": "",
      "enabled": true
    }
  ]
}
```

## First Tests to Run

1. **Health Check** - Verify server is responding
2. **System Status** - Confirm mock services are loaded  
3. **Authentication** - Get auth tokens for subsequent tests

## Test Execution Order

```
Health → Auth → Buyer Registration → Dealer Setup → Verification API
```