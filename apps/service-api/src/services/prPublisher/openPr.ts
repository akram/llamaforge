import { Octokit } from '@octokit/rest';
import { getPrTemplate } from './template.js';
import { getEnv } from '../../libs/env.js';

const env = getEnv();

export interface OpenPROptions {
  owner: string;
  repo: string;
  branchName: string;
  baseBranch: string;
  originalPRNumber: number;
  originalPRUrl: string;
  testCount: number;
  coverageEstimate?: number;
  octokit: Octokit;
}

/**
 * Open a pull request with generated tests
 */
export async function openPR(options: OpenPROptions): Promise<string> {
  const {
    owner,
    repo,
    branchName,
    baseBranch,
    originalPRNumber,
    originalPRUrl,
    testCount,
    coverageEstimate,
    octokit,
  } = options;

  const title = `tests: unit & snapshots for #${originalPRNumber}`;
  const body = getPrTemplate({
    originalPRNumber,
    originalPRUrl,
    testCount,
    coverageEstimate,
  });

  // If DRY_RUN is enabled, return a mock PR URL
  if (env.DRY_RUN) {
    console.log(`[DRY_RUN] Would open PR: ${title}`);
    return `https://github.com/${owner}/${repo}/pull/9999`;
  }

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head: branchName,
    base: baseBranch,
    body,
  });

  // Add labels
  try {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels: ['agent-pr', 'tests', 'non-regression'],
    });
  } catch (error) {
    console.warn('Failed to add labels:', error);
  }

  return pr.html_url;
}

