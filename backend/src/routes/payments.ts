import { FastifyInstance } from 'fastify';

export default async function paymentsRoutes(fastify: FastifyInstance) {
  
  // Stripe webhook
  fastify.post('/webhook', async (request, reply) => {
    try {
      const stripeEvent = request.body as any;

      if (stripeEvent.type === 'payment_intent.succeeded') {
        const paymentIntent = stripeEvent.data.object;
        const { updatePaymentStatus } = await import('../services/supabase.js');
        
        await updatePaymentStatus(paymentIntent.id, {
          status: 'succeeded',
          payment_timestamp: new Date().toISOString()
        });
      }

      if (stripeEvent.type === 'payment_intent.payment_failed') {
        const paymentIntent = stripeEvent.data.object;
        const { updatePaymentStatus } = await import('../services/supabase.js');
        
        await updatePaymentStatus(paymentIntent.id, {
          status: 'failed',
          payment_timestamp: new Date().toISOString()
        });
      }

      return reply.status(200).send({ received: true });
    } catch (error) {
      return reply.status(400).send({ error: 'Webhook failed' });
    }
  });

  // Get user payment history
  fastify.get('/history', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const authAccount = request.user!;
      const { getBuyerByEmail, getDealerByAuthId, getUserPayments } = await import('../services/supabase.js');
      
      let accountId: string;
      let accountType: 'buyer' | 'dealer';
      
      // Determine account type and get account ID
      const buyer = await getBuyerByEmail(authAccount.email);
      if (buyer) {
        accountId = buyer.id;
        accountType = 'buyer';
      } else {
        const dealer = await getDealerByAuthId(authAccount.id);
        if (!dealer) {
          return reply.status(404).send({ error: 'Account not found' });
        }
        accountId = dealer.id;
        accountType = 'dealer';
      }

      const payments = await getUserPayments(accountId);
      
      return reply.send({
        account_type: accountType,
        payments: payments.map(p => ({
          id: p.id,
          customer_reference_id: p.customer_reference_id,
          transaction_type: p.transaction_type,
          amount_cents: p.amount_cents,
          status: p.status,
          payment_timestamp: p.payment_timestamp,
          created_at: p.created_at
        }))
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get payment history' });
    }
  });

  // Get verification payments (buyers only)
  fastify.get('/verifications', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // TODO: Add admin check
      const { getPaymentsByTransactionType } = await import('../services/supabase.js');
      const payments = await getPaymentsByTransactionType('verification');
      
      return reply.send({
        transaction_type: 'verification',
        total_payments: payments.length,
        total_revenue_cents: payments
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + p.amount_cents, 0),
        payments: payments.map(p => ({
          id: p.id,
          customer_reference_id: p.customer_reference_id,
          amount_cents: p.amount_cents,
          status: p.status,
          payment_timestamp: p.payment_timestamp
        }))
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get verification payments' });
    }
  });

  // Get subscription payments (dealers only)
  fastify.get('/subscriptions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // TODO: Add admin check
      const { getPaymentsByTransactionType } = await import('../services/supabase.js');
      const payments = await getPaymentsByTransactionType('subscription');
      
      return reply.send({
        transaction_type: 'subscription',
        total_payments: payments.length,
        total_revenue_cents: payments
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + p.amount_cents, 0),
        payments: payments.map(p => ({
          id: p.id,
          customer_reference_id: p.customer_reference_id,
          amount_cents: p.amount_cents,
          status: p.status,
          payment_timestamp: p.payment_timestamp
        }))
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get subscription payments' });
    }
  });

  // Get payments by customer reference (survives account deletion)
  fastify.get('/customer/:reference_id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // TODO: Add admin check
      const { reference_id } = request.params as { reference_id: string };
      const { getPaymentsByCustomerReference } = await import('../services/supabase.js');
      
      const payments = await getPaymentsByCustomerReference(reference_id);
      
      return reply.send({
        customer_reference_id: reference_id,
        total_payments: payments.length,
        payments: payments.map(p => ({
          id: p.id,
          transaction_type: p.transaction_type,
          amount_cents: p.amount_cents,
          status: p.status,
          payment_timestamp: p.payment_timestamp,
          account_active: !!p.account_id // null if account deleted
        }))
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to get customer payments' });
    }
  });
}