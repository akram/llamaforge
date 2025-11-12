import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { getEnv } from '../libs/env.js';

const env = getEnv();

export const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
});

/**
 * Get an authenticated Octokit instance for a specific installation
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  return await app.getInstallationOctokit(installationId);
}

