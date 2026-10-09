// E2E ONLY: a tiny local stand-in for the parts of Stripe's REST API the server uses
// (create/retrieve PaymentIntent, create Refund), so the full order flow — payment, staff,
// pickup, review — can run in CI without Stripe keys. Production always talks to Stripe.
// POST /test/succeed/:id marks a PaymentIntent as paid (what a customer's card payment does).
import { createServer } from 'node:http';

const port = Number(process.env.FAKE_STRIPE_PORT ?? 12111);
const intents = new Map();
const refunds = [];

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
    const form = new URLSearchParams(raw);
    const path = url.pathname;
    if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true });

    if (req.method === 'POST' && path === '/v1/payment_intents') {
      const key = req.headers['idempotency-key'];
      const existing = [...intents.values()].find((i) => i._key && i._key === key);
      if (existing) return send(res, 200, existing);
      const id = `pi_e2e_${intents.size + 1}`;
      const intent = {
        id,
        object: 'payment_intent',
        status: 'requires_payment_method',
        amount: Number(form.get('amount')),
        amount_received: 0,
        currency: form.get('currency'),
        metadata: { orderId: form.get('metadata[orderId]') },
        client_secret: `${id}_secret_e2e`,
        _key: key,
      };
      intents.set(id, intent);
      return send(res, 200, intent);
    }

    const intentMatch = path.match(/^\/v1\/payment_intents\/([\w-]+)$/);
    if (req.method === 'GET' && intentMatch) {
      const intent = intents.get(intentMatch[1]);
      return intent
        ? send(res, 200, intent)
        : send(res, 404, { error: { type: 'invalid_request_error', message: 'No such intent' } });
    }

    if (req.method === 'POST' && path === '/v1/refunds') {
      const refund = { id: `re_e2e_${refunds.length + 1}`, object: 'refund', status: 'succeeded' };
      refunds.push({ ...refund, payment_intent: form.get('payment_intent') });
      return send(res, 200, refund);
    }

    const succeed = path.match(/^\/test\/succeed\/([\w-]+)$/);
    if (req.method === 'POST' && succeed) {
      const intent = intents.get(succeed[1]);
      if (!intent) return send(res, 404, { error: 'unknown intent' });
      intent.status = 'succeeded';
      intent.amount_received = intent.amount;
      return send(res, 200, intent);
    }
    return send(res, 404, {
      error: { type: 'invalid_request_error', message: `No route ${path}` },
    });
  });
}).listen(port, '127.0.0.1', () => console.log(`[fake-stripe] listening on ${port}`));
