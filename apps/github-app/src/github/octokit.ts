import { App } from '@octokit/app';
import { getEnv } from '../libs/env.js';

const env = getEnv();

export const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
});

/**
 * Get an authenticated Octokit instance for a specific installation
 */
export async function getInstallationOctokit(installationId: number) {
  return await app.getInstallationOctokit(installationId);
}

