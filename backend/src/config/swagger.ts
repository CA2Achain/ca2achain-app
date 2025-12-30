export const swaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'CA2AChain API',
      description: 'Secure age and address verification API using zero-knowledge proofs and blockchain compliance',
      version: '1.0.0',
      contact: {
        name: 'CA2AChain Support',
        email: 'support@ca2achain.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://ca2achain.com/terms'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'https://api.ca2achain.com',
        description: 'Production API'
      },
      {
        url: 'http://localhost:3001',
        description: 'Development API'
      }
    ],
    tags: [
      {
        name: 'auth',
        description: 'Authentication endpoints - Magic link login for buyers and dealers'
      },
      {
        name: 'buyer',
        description: 'Buyer account management - Registration, verification, and privacy controls'
      },
      {
        name: 'dealer', 
        description: 'Dealer account management - SaaS billing, API keys, and credit system'
      },
      {
        name: 'verification',
        description: 'ID verification API - Age and address verification using ZKP'
      },
      {
        name: 'payments',
        description: 'Payment processing - Stripe integration for buyers and dealers'
      },
      {
        name: 'webhooks',
        description: 'Webhook endpoints - Payment status updates and verification callbacks'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT token for authenticated users'
        },
        apiKey: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Dealer API key (format: ca2a_...)'
        }
      },
      schemas: {
        // Standard API response
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['success']
        },
        
        // Verification response
        VerificationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            verification_id: { type: 'string', format: 'uuid' },
            age_verified: { type: 'boolean' },
            address_verified: { type: 'boolean' },
            address_match_confidence: { type: 'number', minimum: 0, maximum: 1 },
            blockchain_transaction_hash: { type: 'string' },
            verified_at: { type: 'string', format: 'date-time' }
          },
          required: ['success', 'verification_id', 'age_verified', 'address_verified']
        },

        // Buyer account
        BuyerAccount: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            phone: { type: 'string', pattern: '^[0-9]{10}$' },
            buyer_reference_id: { type: 'string', pattern: '^BUY_[a-z0-9]{8}$' },
            verification_status: { type: 'string', enum: ['pending', 'verified', 'failed'] },
            verified_at: { type: 'string', format: 'date-time', nullable: true },
            payment_status: { type: 'string', enum: ['pending', 'succeeded', 'failed', 'refunded'] },
            created_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'first_name', 'last_name', 'phone', 'verification_status', 'payment_status']
        },

        // Dealer account
        DealerAccount: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_name: { type: 'string' },
            business_email: { type: 'string', format: 'email' },
            dealer_reference_id: { type: 'string', pattern: '^DLR_[a-z0-9]{8}$' },
            subscription_tier: { type: 'integer', enum: [1, 2, 3] },
            subscription_status: { type: 'string', enum: ['active', 'trialing', 'past_due', 'canceled'] },
            credits_purchased: { type: 'integer' },
            additional_credits_purchased: { type: 'integer' },
            credits_used: { type: 'integer' },
            credits_expire_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'company_name', 'business_email', 'subscription_tier', 'subscription_status']
        },

        // Verification request
        VerificationRequest: {
          type: 'object',
          properties: {
            buyer_reference_id: { 
              type: 'string', 
              pattern: '^BUY_[a-z0-9]{8}$',
              description: 'Buyer reference ID to verify'
            },
            verify_age: { 
              type: 'boolean',
              description: 'Request age verification (18+)'
            },
            verify_address: {
              type: 'boolean', 
              description: 'Request address verification'
            },
            customer_address: {
              type: 'object',
              description: 'Customer address to verify against (optional)',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip_code: { type: 'string' }
              }
            }
          },
          required: ['buyer_reference_id']
        },

        // Error response
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          },
          required: ['success', 'error']
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Unauthorized',
                message: 'Valid authentication required'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Forbidden',
                message: 'Insufficient permissions'
              }
            }
          }
        },
        InsufficientCreditsError: {
          description: 'Insufficient verification credits',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Insufficient credits',
                message: 'No verification credits available. Please purchase additional credits.'
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  exposeRoute: true,
  staticCSP: true,
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    defaultModelExpandDepth: 3,
    tryItOutEnabled: true
  },
  uiHooks: {
    onRequest: function (request: any, reply: any, next: any) {
      next();
    },
    preHandler: function (request: any, reply: any, next: any) {
      next();
    }
  }
};