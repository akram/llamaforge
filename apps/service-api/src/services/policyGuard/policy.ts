import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import type { BotPolicy, PolicyViolation } from '@llamaforge/types';

/**
 * Load and parse .bot-policy.yml from repository
 */
export async function loadPolicy(repoPath: string): Promise<BotPolicy> {
  const policyPath = `${repoPath}/.bot-policy.yml`;

  try {
    const content = await readFile(policyPath, 'utf-8');
    const parsed = parse(content) as Partial<BotPolicy>;

    // Validate and set defaults
    const policy: BotPolicy = {
      allowedPaths: parsed.allowedPaths || ['__tests__', 'tests', 'src/__tests__'],
      forbiddenGlobs: parsed.forbiddenGlobs || ['**/node_modules/**', '**/dist/**'],
      maxDiffLines: parsed.maxDiffLines || 5000,
      testFramework: parsed.testFramework || 'vitest',
      snapshotMaskFields: parsed.snapshotMaskFields || ['timestamp', 'id', 'uuid'],
      requireDeterminism: parsed.requireDeterminism ?? true,
      maxPRSize: parsed.maxPRSize || 500,
    };

    return policy;
  } catch (error) {
    // If policy file doesn't exist, use defaults
    if ((error as { code?: string }).code === 'ENOENT') {
      return {
        allowedPaths: ['__tests__', 'tests', 'src/__tests__'],
        forbiddenGlobs: ['**/node_modules/**', '**/dist/**'],
        maxDiffLines: 5000,
        testFramework: 'vitest',
        snapshotMaskFields: ['timestamp', 'id', 'uuid'],
        requireDeterminism: true,
        maxPRSize: 500,
      };
    }
    throw error;
  }
}

/**
 * Validate generated tests against policy
 */
export function validatePolicy(
  policy: BotPolicy,
  tests: { unitTests: Record<string, string>; snapshots: Record<string, string> },
  diffLines: number
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  // Check diff size
  if (diffLines > policy.maxDiffLines) {
    violations.push({
      rule: 'maxDiffLines',
      message: `Diff exceeds maximum allowed lines: ${diffLines} > ${policy.maxDiffLines}`,
    });
  }

  // Check PR size (total lines in generated tests)
  const allTests = { ...tests.unitTests, ...tests.snapshots };
  const totalLines = Object.values(allTests).reduce((sum, content) => {
    return sum + content.split('\n').length;
  }, 0);

  if (totalLines > policy.maxPRSize) {
    violations.push({
      rule: 'maxPRSize',
      message: `Generated PR exceeds maximum size: ${totalLines} lines > ${policy.maxPRSize}`,
    });
  }

  // Check allowed paths
  const allTestPaths = Object.keys(allTests);
  for (const testPath of allTestPaths) {
    const isAllowed = policy.allowedPaths.some((allowed) => testPath.startsWith(allowed));
    if (!isAllowed) {
      violations.push({
        rule: 'allowedPaths',
        message: `Test path ${testPath} is not in allowed paths`,
        file: testPath,
      });
    }

    // Check forbidden globs
    const isForbidden = policy.forbiddenGlobs.some((glob) => {
      const regex = new RegExp(glob.replace(/\*/g, '.*'));
      return regex.test(testPath);
    });
    if (isForbidden) {
      violations.push({
        rule: 'forbiddenGlobs',
        message: `Test path ${testPath} matches forbidden glob pattern`,
        file: testPath,
      });
    }
  }

  return violations;
}

