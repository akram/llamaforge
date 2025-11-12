/**
 * Shared TypeScript types for LlamaForge
 */

export interface GitHubPRPayload {
  installationId: number;
  repo: string;
  owner: string;
  prNumber: number;
  headSHA: string;
  baseSHA: string;
  htmlUrl: string;
  action?: 'opened' | 'synchronize' | 'reopened';
}

export interface JobRequest {
  prUrl: string;
  testTypes?: ('unit' | 'snapshot')[];
  installationId?: number;
  repo?: string;
  owner?: string;
  prNumber?: number;
  headSHA?: string;
  baseSHA?: string;
}

export interface JobStatus {
  id: string;
  key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
  result?: {
    prUrl?: string;
    testCount?: number;
    coverageEstimate?: number;
  };
}

export interface ContextBundle {
  diff: string;
  changedFiles: string[];
  relatedFiles: Record<string, string>; // path -> content
  existingTests: Record<string, string>; // path -> content
  coverageReport?: CoverageReport;
  styleRules: StyleRules;
  publicAPIs: PublicAPI[];
}

export interface CoverageReport {
  total: number;
  covered: number;
  percentage: number;
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  statements: { total: number; covered: number };
  branches: { total: number; covered: number };
  functions: { total: number; covered: number };
  lines: { total: number; covered: number };
}

export interface StyleRules {
  framework: 'vitest' | 'jest' | 'mocha' | 'pytest' | 'other';
  testDir: string;
  snapshotDir?: string;
  importStyle: 'esm' | 'cjs' | 'mixed';
  formatter: 'prettier' | 'eslint' | 'black' | 'other';
}

export interface PublicAPI {
  file: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'type';
  signature?: string;
  description?: string;
}

export interface LlamaStackRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools?: LlamaTool[];
  max_tokens?: number;
  temperature?: number;
}

export interface LlamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlamaStackResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TestPlan {
  unitTests: Array<{
    file: string;
    target: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  snapshots: Array<{
    file: string;
    target: string;
    description: string;
  }>;
}

export interface GeneratedTests {
  unitTests: Record<string, string>; // path -> content
  snapshots: Record<string, string>; // path -> content
  metadata: {
    totalLines: number;
    testCount: number;
    snapshotCount: number;
  };
}

export interface BotPolicy {
  allowedPaths: string[];
  forbiddenGlobs: string[];
  maxDiffLines: number;
  testFramework: 'vitest' | 'jest' | 'mocha' | 'pytest' | 'other';
  snapshotMaskFields?: string[];
  requireDeterminism: boolean;
  maxPRSize: number;
}

export interface PolicyViolation {
  rule: string;
  message: string;
  file?: string;
  line?: number;
}

