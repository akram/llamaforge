import { Octokit } from '@octokit/rest';
import type { ContextBundle } from '@llamaforge/types';

export interface DiffFetcherOptions {
  owner: string;
  repo: string;
  baseSHA: string;
  headSHA: string;
  octokit: Octokit;
}

export async function fetchDiff(options: DiffFetcherOptions): Promise<{
  diff: string;
  changedFiles: string[];
}> {
  const { owner, repo, baseSHA, headSHA, octokit } = options;

  // Compare the two commits
  const { data: comparison } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: baseSHA,
    head: headSHA,
  });

  const changedFiles = comparison.files?.map((file) => file.filename) || [];
  const diff = comparison.files
    ?.map((file) => {
      const patch = file.patch || '';
      return `diff --git a/${file.filename} b/${file.filename}\n${patch}`;
    })
    .join('\n\n') || '';

  return { diff, changedFiles };
}

