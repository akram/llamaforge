import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import { getEnv } from '../../libs/env.js';

const env = getEnv();

export interface CreateBranchOptions {
  owner: string;
  repo: string;
  baseSHA: string;
  branchName: string;
  repoPath: string;
  octokit: Octokit;
}

/**
 * Create a new branch from base SHA and push it
 */
export async function createAndPushBranch(options: CreateBranchOptions): Promise<void> {
  const { owner, repo, baseSHA, branchName, repoPath } = options;

  const git = simpleGit(repoPath);

  // Fetch base branch
  await git.fetch('origin', baseSHA);

  // Create branch from base
  await git.checkout(['-b', branchName, baseSHA]);

  // If DRY_RUN is enabled, don't push
  if (env.DRY_RUN) {
    console.log(`[DRY_RUN] Would push branch ${branchName} to ${owner}/${repo}`);
    return;
  }

  // Push branch
  await git.push('origin', branchName, ['--set-upstream']);

  console.log(`Pushed branch ${branchName} to ${owner}/${repo}`);
}

