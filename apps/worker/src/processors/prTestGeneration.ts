import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { getEnv } from '../libs/env.js';
import { updateJobStatus } from '../libs/db.js';
import { fetchDiff } from '../../../service-api/src/services/contextBuilder/diffFetcher.js';
import { fetchRelatedFiles } from '../../../service-api/src/services/contextBuilder/relatedFiles.js';
import { fetchCoverageReport } from '../../../service-api/src/services/contextBuilder/coverageFetcher.js';
import { LlamaStackClient } from '../../../service-api/src/services/llamastack/client.js';
import { loadPolicy, validatePolicy } from '../../../service-api/src/services/policyGuard/policy.js';
import { writeTests, formatCode, runSmokeTests } from '../../../service-api/src/services/patchApplier/writer.js';
import { createAndPushBranch } from '../../../service-api/src/services/prPublisher/branch.js';
import { openPR } from '../../../service-api/src/services/prPublisher/openPr.js';
import { attemptAutoRepair } from '../../../service-api/src/services/autoRepair/fixer.js';
import type { Job } from 'bullmq';

const env = getEnv();
const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
});

export interface PRTestGenerationData {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
  headSHA: string;
  baseSHA: string;
  htmlUrl: string;
  testTypes?: ('unit' | 'snapshot')[];
}

/**
 * Main processor for PR test generation jobs
 */
export async function processPRTestGeneration(
  data: PRTestGenerationData,
  job: Job
): Promise<{ prUrl: string; testCount: number }> {
  const { installationId, owner, repo, prNumber, headSHA, baseSHA, htmlUrl } = data;
  const idempotencyKey = `${owner}/${repo}:${headSHA}`;

  // Update job status
  await updateJobStatus(idempotencyKey, 'processing');

  let repoPath: string | undefined;
  let octokit: Octokit | undefined;

  try {
    // Get installation Octokit
    octokit = await app.getInstallationOctokit(installationId);

    // Create temporary directory for repo clone
    repoPath = await mkdtemp(join(tmpdir(), 'llamaforge-'));

    // Clone repository (shallow)
    const git = simpleGit();
    await git.clone(`https://github.com/${owner}/${repo}.git`, repoPath, ['--depth', '1', '--branch', baseSHA]);

    // Update job progress
    await job.updateProgress(10);

    // Step 1: Build context
    console.log('Building context...');
    const { diff, changedFiles } = await fetchDiff({
      owner,
      repo,
      baseSHA,
      headSHA,
      octokit,
    });

    const relatedFiles = await fetchRelatedFiles({
      owner,
      repo,
      changedFiles,
      ref: baseSHA,
      octokit,
    });

    const coverageReport = await fetchCoverageReport({
      owner,
      repo,
      ref: baseSHA,
      octokit,
    });

    // Load policy
    const policy = await loadPolicy(repoPath);

    const context = {
      diff,
      changedFiles,
      relatedFiles,
      existingTests: {}, // TODO: Fetch existing tests
      coverageReport,
      styleRules: {
        framework: policy.testFramework,
        testDir: policy.allowedPaths[0] || '__tests__',
        importStyle: 'esm',
        formatter: 'prettier',
      },
      publicAPIs: [],
    };

    await job.updateProgress(30);

    // Step 2: Generate tests with LlamaStack
    console.log('Generating tests...');
    const llamaClient = new LlamaStackClient();

    const analysis = await llamaClient.analyzeDiff(context);
    const plan = await llamaClient.planTests(context);
    const unitTests = await llamaClient.generateUnitTests(context, plan);
    const snapshots = await llamaClient.generateSnapshots(context, plan);
    const critique = await llamaClient.selfCritique(
      { ...unitTests, snapshots },
      context
    );

    // Apply critique suggestions if any
    // TODO: Re-generate if critical issues found

    await job.updateProgress(60);

    // Step 3: Validate policy
    console.log('Validating policy...');
    const violations = validatePolicy(policy, { ...unitTests, snapshots }, diff.split('\n').length);
    if (violations.length > 0) {
      const errorMsg = violations.map((v) => `${v.rule}: ${v.message}`).join('; ');
      throw new Error(`Policy violations: ${errorMsg}`);
    }

    // Step 4: Write tests
    console.log('Writing tests...');
    await writeTests({
      repoPath,
      tests: { ...unitTests, snapshots },
      policy,
    });

    await formatCode(repoPath, policy);

    await job.updateProgress(80);

    // Step 5: Run smoke tests
    console.log('Running smoke tests...');
    const smokeResult = await runSmokeTests(repoPath, policy);
    if (!smokeResult.success) {
      // Attempt auto-repair
      const repairResult = await attemptAutoRepair({
        repoPath,
        tests: { ...unitTests, snapshots },
        policy,
      });

      if (!repairResult.success) {
        // Post comment to original PR instead of opening new PR
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: `## Test Generation Failed

The generated tests failed smoke tests. Here's the output:

\`\`\`
${smokeResult.output}
\`\`\`

**Auto-repair attempt:** ${repairResult.message}

Please review the generated tests manually or fix the issues.`,
        });

        throw new Error(`Smoke tests failed: ${smokeResult.output}`);
      }
    }

    await job.updateProgress(90);

    // Step 6: Create branch and push
    console.log('Creating branch and pushing...');
    const branchName = `llamaforge/tests/${headSHA.substring(0, 7)}`;
    await createAndPushBranch({
      owner,
      repo,
      baseSHA,
      branchName,
      repoPath,
      octokit,
    });

    // Commit changes
    const repoGit = simpleGit(repoPath);
    await repoGit.add('.');
    await repoGit.commit(`tests: auto-generated tests for PR #${prNumber}`);

    if (!env.DRY_RUN) {
      await repoGit.push('origin', branchName);
    }

    // Step 7: Open PR
    console.log('Opening PR...');
    const prUrl = await openPR({
      owner,
      repo,
      branchName,
      baseBranch: baseSHA, // TODO: Get actual base branch name
      originalPRNumber: prNumber,
      originalPRUrl: htmlUrl,
      testCount: unitTests.metadata.testCount + Object.keys(snapshots).length,
      coverageEstimate: coverageReport?.percentage,
      octokit,
    });

    // Comment on original PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## ✅ Tests Generated

I've generated tests for this PR. See: ${prUrl}

**Test Count:** ${unitTests.metadata.testCount} unit tests, ${Object.keys(snapshots).length} snapshots`,
    });

    await job.updateProgress(100);

    const result = {
      prUrl,
      testCount: unitTests.metadata.testCount + Object.keys(snapshots).length,
    };

    await updateJobStatus(idempotencyKey, 'completed', undefined, result);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Job failed:', error);
    await updateJobStatus(idempotencyKey, 'failed', errorMsg);

    // Try to comment on original PR about failure
    if (octokit) {
      try {
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: `## ❌ Test Generation Failed

An error occurred while generating tests:

\`\`\`
${errorMsg}
\`\`\`

Please check the job logs for more details.`,
        });
      } catch (commentError) {
        console.error('Failed to post comment:', commentError);
      }
    }

    throw error;
  } finally {
    // Cleanup temporary directory
    if (repoPath) {
      try {
        await rm(repoPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to cleanup temp directory:', error);
      }
    }
  }
}

