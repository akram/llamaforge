import type { GeneratedTests } from '@llamaforge/types';
import { formatCode, runSmokeTests } from '../patchApplier/writer.js';
import type { BotPolicy } from '@llamaforge/types';

export interface AutoRepairOptions {
  repoPath: string;
  tests: GeneratedTests;
  policy: BotPolicy;
  maxAttempts?: number;
}

/**
 * Attempt to auto-repair test failures (formatting, imports, etc.)
 * Returns true if repair was successful, false otherwise
 */
export async function attemptAutoRepair(
  options: AutoRepairOptions
): Promise<{ success: boolean; message: string }> {
  const { repoPath, tests, policy, maxAttempts = 1 } = options;

  // Attempt 1: Format code
  try {
    await formatCode(repoPath, policy);
  } catch (error) {
    return {
      success: false,
      message: `Formatting failed: ${error}`,
    };
  }

  // Run smoke tests again
  const smokeResult = await runSmokeTests(repoPath, policy);
  if (smokeResult.success) {
    return {
      success: true,
      message: 'Auto-repair successful: formatting fixed issues',
    };
  }

  // If still failing and we have attempts left, could try:
  // - Fixing imports
  // - Adjusting test syntax
  // For now, return failure after first attempt
  return {
    success: false,
    message: `Tests still failing after auto-repair: ${smokeResult.output}`,
  };
}

