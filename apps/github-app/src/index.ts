import Fastify from 'fastify';
import { webhooks } from '@octokit/webhooks';
import type { WebhookEventMap } from '@octokit/webhooks';
import { handlePullRequest } from './handlers/pull_request.js';
import { verifyHmac } from './security/verifyHmac.js';
import { getEnv } from './libs/env.js';

const env = getEnv();
const app = Fastify({ logger: true });

// Webhook signature verification middleware
app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/webhooks')) {
    const signature = request.headers['x-hub-signature-256'] as string;
    const body = request.body as string;

    if (!signature || !verifyHmac(body, signature, env.GITHUB_WEBHOOK_SECRET)) {
      reply.code(401).send({ error: 'Invalid signature' });
      return;
    }
  }
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', service: 'github-app' };
});

// Webhook endpoint
app.post('/webhooks', async (request, reply) => {
  const event = request.headers['x-github-event'] as string;
  const deliveryId = request.headers['x-github-delivery'] as string;

  app.log.info({ event, deliveryId }, 'Received webhook');

  try {
    // Validate timestamp to prevent replay attacks
    const timestamp = request.headers['x-github-delivered'] as string;
    if (timestamp) {
      const deliveredAt = parseInt(timestamp, 10);
      const now = Date.now();
      const age = now - deliveredAt;
      // Reject events older than 5 minutes
      if (age > 5 * 60 * 1000) {
        app.log.warn({ age }, 'Rejecting stale webhook');
        reply.code(400).send({ error: 'Stale event' });
        return;
      }
    }

    const payload = request.body as WebhookEventMap[keyof WebhookEventMap];

    if (event === 'pull_request') {
      await handlePullRequest(payload as WebhookEventMap['pull_request'], app.log);
    } else {
      app.log.info({ event }, 'Ignoring webhook event');
    }

    reply.code(200).send({ received: true });
  } catch (error) {
    app.log.error({ error }, 'Error processing webhook');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT || 3001, host: '0.0.0.0' });
    app.log.info(`GitHub App listening on port ${env.PORT || 3001}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

