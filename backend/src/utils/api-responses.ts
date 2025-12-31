import type { FastifyReply } from 'fastify';

// Standardized API response interfaces
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Response builders with consistent structure
export const successResponse = <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
  success: true,
  data,
  ...(message && { message })
});

export const errorResponse = (error: string, message?: string, code?: string): ApiErrorResponse => ({
  success: false,
  error,
  ...(message && { message }),
  ...(code && { code })
});

// Fastify reply helpers
export const sendSuccess = <T>(reply: FastifyReply, data: T, status = 200, message?: string) => {
  return reply.status(status).send(successResponse(data, message));
};

export const sendError = (reply: FastifyReply, error: string, status = 500, message?: string, code?: string) => {
  return reply.status(status).send(errorResponse(error, message, code));
};

// Common error responses
export const sendValidationError = (reply: FastifyReply, message: string) => {
  return sendError(reply, 'Validation Error', 400, message, 'VALIDATION_ERROR');
};

export const sendUnauthorized = (reply: FastifyReply, message = 'Authentication required') => {
  return sendError(reply, 'Unauthorized', 401, message, 'UNAUTHORIZED');
};

export const sendForbidden = (reply: FastifyReply, message = 'Access forbidden') => {
  return sendError(reply, 'Forbidden', 403, message, 'FORBIDDEN');
};

export const sendNotFound = (reply: FastifyReply, message = 'Resource not found') => {
  return sendError(reply, 'Not Found', 404, message, 'NOT_FOUND');
};

export const sendInsufficientCredits = (reply: FastifyReply, message = 'Insufficient verification credits') => {
  return sendError(reply, 'Insufficient Credits', 402, message, 'INSUFFICIENT_CREDITS');
};

// Schema helpers for route definitions (Swagger references removed for now)
export const createRouteSchema = (options: {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: Array<Record<string, string[]>>;
  body?: any;
  querystring?: any;
  params?: any;
  response?: any;
}) => ({
  schema: {
    ...(options.body && { body: options.body }),
    ...(options.querystring && { querystring: options.querystring }),
    ...(options.params && { params: options.params }),
    ...(options.response && { 
      response: {
        200: options.response
      }
    })
  }
});

// Security schemes for different endpoint types
export const authRequired = [{ bearerAuth: [] }];
export const apiKeyRequired = [{ apiKey: [] }];

// Common schema patterns
export const uuidParam = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'UUID identifier'
    }
  },
  required: ['id']
};

export const paginationQuery = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number'
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page'
    }
  }
};

export const buyerReferenceParam = {
  type: 'object',
  properties: {
    buyer_reference_id: {
      type: 'string',
      pattern: '^BUY_[a-z0-9]{8}$',
      description: 'Buyer reference ID'
    }
  },
  required: ['buyer_reference_id']
};