import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GeneratedTests, BotPolicy } from '@llamaforge/types';
import { getEnv } from '../../libs/env.js';

const execAsync = promisify(exec);
const env = getEnv();

export interface WriteTestsOptions {
  repoPath: string;
  tests: GeneratedTests;
  policy: BotPolicy;
}

/**
 * Write test files to the repository, respecting policy constraints
 */
export async function writeTests(options: WriteTestsOptions): Promise<void> {
  const { repoPath, tests, policy } = options;

  // Validate all test paths against policy
  const allTestPaths = [
    ...Object.keys(tests.unitTests),
    ...Object.keys(tests.snapshots),
  ];

  for (const testPath of allTestPaths) {
    // Check if path is allowed
    const isAllowed = policy.allowedPaths.some((allowed) => testPath.startsWith(allowed));
    if (!isAllowed) {
      throw new Error(`Test path ${testPath} is not in allowed paths: ${policy.allowedPaths.join(', ')}`);
    }

    // Check if path matches forbidden globs
    const isForbidden = policy.forbiddenGlobs.some((glob) => {
      const regex = new RegExp(glob.replace(/\*/g, '.*'));
      return regex.test(testPath);
    });
    if (isForbidden) {
      throw new Error(`Test path ${testPath} matches forbidden glob pattern`);
    }

    // Ensure directory exists
    const fullPath = join(repoPath, testPath);
    await mkdir(dirname(fullPath), { recursive: true });

    // Write test file
    await writeFile(fullPath, tests.unitTests[testPath] || tests.snapshots[testPath], 'utf-8');
  }
}

/**
 * Format code using repository's formatter
 */
export async function formatCode(repoPath: string, policy: BotPolicy): Promise<void> {
  const formatters: Record<string, string> = {
    prettier: 'pnpm format',
    eslint: 'pnpm lint --fix',
    black: 'black .',
  };

  const formatter = formatters[policy.testFramework] || formatters.prettier;

  try {
    await execAsync(formatter, { cwd: repoPath });
  } catch (error) {
    console.warn('Formatter failed, continuing:', error);
  }
}

/**
 * Run local smoke tests
 */
export async function runSmokeTests(repoPath: string, policy: BotPolicy): Promise<{
  success: boolean;
  output: string;
}> {
  const testCommands: Record<string, string> = {
    vitest: 'pnpm test --reporter dot',
    jest: 'pnpm test --passWithNoTests',
    mocha: 'pnpm test',
    pytest: 'pytest --tb=short',
  };

  const testCommand = testCommands[policy.testFramework] || testCommands.vitest;

  try {
    const { stdout, stderr } = await execAsync(testCommand, {
      cwd: repoPath,
      timeout: 60000, // 60s timeout
    });

    return {
      success: true,
      output: stdout + stderr,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    return {
      success: false,
      output: (execError.stdout || '') + (execError.stderr || ''),
    };
  }
}

