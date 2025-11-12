/**
 * System and task prompts for LlamaStack interactions
 */

export const SYSTEM_PROMPTS = {
  ANALYZER: `You are a code analysis assistant. Analyze code diffs and extract:
- Public APIs (functions, classes, interfaces, types)
- Dependencies and imports
- Test coverage gaps
- Code complexity metrics`,

  PLANNER: `You are a test planning assistant. Create comprehensive test plans that:
- Cover all public APIs
- Include edge cases and error scenarios
- Follow testing best practices
- Respect repository testing conventions`,

  GENERATOR: `You are a test generation assistant. Generate high-quality tests that:
- Are deterministic and reproducible
- Follow the repository's test framework conventions
- Include proper setup/teardown
- Have clear, descriptive test names
- Cover happy paths and edge cases`,

  CRITIC: `You are a code review assistant. Critique test code for:
- Correctness and completeness
- Adherence to best practices
- Potential flakiness or non-determinism
- Missing edge cases
- Code quality and maintainability`,
};

export function buildAnalysisPrompt(diff: string, relatedFiles: string[]): string {
  return `Analyze this code diff and extract public APIs:

\`\`\`diff
${diff}
\`\`\`

Related files context:
${relatedFiles.slice(0, 5).join('\n')}

Provide:
1. List of public APIs that need testing
2. Summary of changes
3. Suggested test priorities`;
}

export function buildPlanningPrompt(
  diff: string,
  publicAPIs: string[],
  coverage: number
): string {
  return `Create a test plan for these changes:

Diff:
\`\`\`diff
${diff}
\`\`\`

Public APIs to test:
${publicAPIs.map((api) => `- ${api}`).join('\n')}

Current coverage: ${coverage}%

Generate a test plan with:
- Unit tests for each public API
- Snapshot tests for UI components (if applicable)
- Integration tests (if needed)
- Priority levels (high/medium/low)`;
}

export function buildGenerationPrompt(
  file: string,
  target: string,
  context: string,
  framework: string
): string {
  return `Generate ${framework} tests for:

File: ${file}
Target: ${target}

Context:
\`\`\`
${context}
\`\`\`

Requirements:
- Use ${framework} testing framework
- Include setup/teardown if needed
- Make tests deterministic (use fixed seeds, mock time)
- Follow repository conventions
- Add descriptive test names`;
}

