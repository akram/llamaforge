import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prTestQueue } from '../server.js';
import { getEnv } from '../libs/env.js';
import { db } from '../libs/db.js';
import type { JobRequest, JobStatus } from '@llamaforge/types';

const env = getEnv();

// Bearer token authentication middleware
async function authenticate(
  request: { headers: Record<string, string | undefined> },
  reply: { code: (code: number) => { send: (data: unknown) => void } }
) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return false;
  }

  const token = authHeader.substring(7);
  if (token !== env.BOT_API_TOKEN) {
    reply.code(403).send({ error: 'Invalid token' });
    return false;
  }

  return true;
}

export async function jobsRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // POST /jobs - Manual job trigger
  fastify.post<{ Body: JobRequest }>('/', async (request, reply) => {
    if (!(await authenticate(request, reply))) {
      return;
    }

    const { prUrl, testTypes } = request.body;

    // Parse PR URL: https://github.com/owner/repo/pull/123
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      reply.code(400).send({ error: 'Invalid PR URL format' });
      return;
    }

    const [, owner, repo, prNumberStr] = match;
    const prNumber = parseInt(prNumberStr, 10);

    // TODO: Fetch PR details from GitHub to get headSHA and baseSHA
    // For now, use placeholder values
    const idempotencyKey = `${owner}/${repo}:manual-${prNumber}-${Date.now()}`;

    try {
      const job = await prTestQueue.add(
        'pr-test-generation',
        {
          owner,
          repo,
          prNumber,
          testTypes: testTypes || ['unit', 'snapshot'],
          manual: true,
        },
        {
          jobId: idempotencyKey,
        }
      );

      fastify.log.info({ jobId: job.id, prUrl }, 'Manually enqueued job');

      return { jobId: job.id, status: 'enqueued' };
    } catch (error) {
      fastify.log.error({ error }, 'Error enqueuing manual job');
      reply.code(500).send({ error: 'Failed to enqueue job' });
    }
  });

  // GET /jobs/:id - Get job status
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      // Try to get from BullMQ first
      const job = await prTestQueue.getJob(id);
      if (job) {
        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        return {
          id: job.id,
          key: job.name,
          status: state,
          progress,
          result,
          lastError: failedReason,
          createdAt: new Date(job.timestamp),
          updatedAt: new Date(job.processedOn || job.timestamp),
        };
      }

      // Fallback to database
      const dbResult = await db.query<JobStatus>(
        'SELECT id, key, status, created_at, updated_at, last_error, result FROM jobs WHERE id = $1 OR key = $1',
        [id]
      );

      if (dbResult.rows.length === 0) {
        reply.code(404).send({ error: 'Job not found' });
        return;
      }

      const row = dbResult.rows[0];
      return {
        id: row.id,
        key: row.key,
        status: row.status,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
        lastError: row.last_error || undefined,
        result: row.result,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching job status');
      reply.code(500).send({ error: 'Failed to fetch job status' });
    }
  });
}

