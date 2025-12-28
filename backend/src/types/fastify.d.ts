// Extend Fastify with our custom decorations
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    authenticateApiKey: (request: any, reply: any) => Promise<void>;
  }
  
  interface FastifyRequest {
    rawBody?: string;
  }
}

export {};