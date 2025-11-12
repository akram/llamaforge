import type { FastifyBaseLogger } from 'fastify';
import { createHmac } from 'crypto';
import { getEnv } from '../libs/env.js';
import type { GitHubPRPayload } from '@llamaforge/types';

const env = getEnv();

// Type for pull_request webhook payload
interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    head: { sha: string };
    base: { sha: string };
    html_url: string;
  };
  repository: {
    name: string;
    owner: { login: string };
  };
  installation?: { id: number };
}

/**
 * Handle pull_request webhook events
 * Validates the event, builds a minimal payload, and forwards it to the service API
 */
export async function handlePullRequest(
  payload: PullRequestPayload,
  logger: FastifyBaseLogger
): Promise<void> {
  const action = payload.action;
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    logger.info({ action }, 'Ignoring pull_request action');
    return;
  }

  const pr = payload.pull_request;
  const repo = payload.repository;
  const installationId = payload.installation?.id;

  if (!installationId) {
    logger.warn('No installation ID in webhook payload');
    return;
  }

  const prPayload: GitHubPRPayload = {
    installationId,
    repo: repo.name,
    owner: repo.owner.login,
    prNumber: pr.number,
    headSHA: pr.head.sha,
    baseSHA: pr.base.sha,
    htmlUrl: pr.html_url,
    action: action as 'opened' | 'synchronize' | 'reopened',
  };

  logger.info({ prPayload }, 'Forwarding PR event to service API');

  try {
    // Sign the payload with HMAC for service API verification
    const body = JSON.stringify(prPayload);
    const signature = createHmac('sha256', env.SERVICE_HMAC_SECRET)
      .update(body)
      .digest('hex');

    const response = await fetch(`${env.SERVICE_API_URL}/events/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Signature': `sha256=${signature}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText },
        'Failed to forward event to service API'
      );
      throw new Error(`Service API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    logger.info({ jobId: result.jobId }, 'Successfully enqueued job');
  } catch (error) {
    logger.error({ error }, 'Error forwarding event to service API');
    throw error;
  }
}

