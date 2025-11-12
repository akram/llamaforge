import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createHmac } from 'crypto';
import { prTestQueue } from '../server.js';
import { getEnv } from '../libs/env.js';
import type { GitHubPRPayload } from '@llamaforge/types';

const env = getEnv();

export async function githubWebhookRoute(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Verify HMAC signature from GitHub App
  fastify.addHook('onRequest', async (request, reply) => {
    const signature = request.headers['x-service-signature'] as string;
    const body = request.body as string;

    if (!signature || !signature.startsWith('sha256=')) {
      reply.code(401).send({ error: 'Missing or invalid signature' });
      return;
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = createHmac('sha256', env.SERVICE_HMAC_SECRET)
      .update(bodyString)
      .digest('hex');
    const receivedSignature = signature.substring(7);

    // Constant-time comparison
    if (expectedSignature.length !== receivedSignature.length) {
      reply.code(401).send({ error: 'Invalid signature' });
      return;
    }

    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }

    if (result !== 0) {
      reply.code(401).send({ error: 'Invalid signature' });
      return;
    }
  });

  fastify.post<{ Body: GitHubPRPayload }>('/github', async (request, reply) => {
    const payload = request.body;

    // Generate idempotency key: owner/repo:headSHA
    const idempotencyKey = `${payload.owner}/${payload.repo}:${payload.headSHA}`;

    try {
      // Check if job already exists
      const existingJob = await prTestQueue.getJob(idempotencyKey);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'completed' || state === 'active' || state === 'waiting') {
          fastify.log.info({ jobId: existingJob.id, state }, 'Job already exists');
          return { jobId: existingJob.id, status: 'existing' };
        }
      }

      // Enqueue new job
      const job = await prTestQueue.add(
        'pr-test-generation',
        {
          installationId: payload.installationId,
          owner: payload.owner,
          repo: payload.repo,
          prNumber: payload.prNumber,
          headSHA: payload.headSHA,
          baseSHA: payload.baseSHA,
          htmlUrl: payload.htmlUrl,
        },
        {
          jobId: idempotencyKey, // Use idempotency key as job ID
        }
      );

      fastify.log.info({ jobId: job.id, key: idempotencyKey }, 'Enqueued PR test generation job');

      return { jobId: job.id, status: 'enqueued' };
    } catch (error) {
      fastify.log.error({ error }, 'Error enqueuing job');
      reply.code(500).send({ error: 'Failed to enqueue job' });
    }
  });
}

