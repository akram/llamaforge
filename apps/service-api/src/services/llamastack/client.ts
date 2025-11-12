import { getEnv } from '../../libs/env.js';
import type {
  LlamaStackRequest,
  LlamaStackResponse,
  ContextBundle,
  TestPlan,
  GeneratedTests,
} from '@llamaforge/types';
import { analyzeDiffTool, planTestsTool, generateUnitTestsTool, generateSnapshotsTool, selfCritiqueTool } from './tools.js';

const env = getEnv();

/**
 * LlamaStack HTTP client with retries and timeouts
 */
export class LlamaStackClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.baseUrl = env.LLAMA_URL;
    this.apiKey = env.LLAMA_API_KEY;
    this.model = env.LLAMA_MODEL;
    this.maxTokens = env.LLAMA_MAX_TOKENS;
  }

  private async request<T>(endpoint: string, body: unknown, retries = 3): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status >= 500 && retries > 0) {
          // Retry on server errors
          await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)));
          return this.request<T>(endpoint, body, retries - 1);
        }
        throw new Error(`LlamaStack API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError' && retries > 0) {
        // Retry on timeout
        return this.request<T>(endpoint, body, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Analyze diff and extract public APIs
   */
  async analyzeDiff(context: ContextBundle): Promise<{ publicAPIs: string[]; summary: string }> {
    // In mock mode, return deterministic fixture
    if (env.LLAMA_URL.includes('mock') || !env.LLAMA_API_KEY) {
      return {
        publicAPIs: ['function processData', 'class DataProcessor'],
        summary: 'Added new data processing functionality with unit tests needed',
      };
    }

    const request: LlamaStackRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a code analysis assistant. Analyze code diffs and extract public APIs.',
        },
        {
          role: 'user',
          content: `Analyze this diff:\n\n${context.diff}\n\nExtract public APIs (functions, classes, interfaces) that need testing.`,
        },
      ],
      tools: [analyzeDiffTool],
      max_tokens: this.maxTokens,
    };

    const response = await this.request<LlamaStackResponse>('/chat/completions', request);
    // Parse tool calls and extract results
    // Simplified for now
    return {
      publicAPIs: [],
      summary: response.choices[0]?.message?.content || 'Analysis complete',
    };
  }

  /**
   * Plan test strategy
   */
  async planTests(context: ContextBundle): Promise<TestPlan> {
    if (env.LLAMA_URL.includes('mock') || !env.LLAMA_API_KEY) {
      return {
        unitTests: [
          {
            file: 'src/utils.ts',
            target: 'processData',
            description: 'Test data processing logic',
            priority: 'high',
          },
        ],
        snapshots: [
          {
            file: 'src/components/DataDisplay.tsx',
            target: 'DataDisplay',
            description: 'Snapshot for data display component',
          },
        ],
      };
    }

    const request: LlamaStackRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a test planning assistant. Create a test plan for code changes.',
        },
        {
          role: 'user',
          content: `Plan tests for:\n\n${context.diff}\n\nExisting coverage: ${context.coverageReport?.percentage || 0}%`,
        },
      ],
      tools: [planTestsTool],
      max_tokens: this.maxTokens,
    };

    const response = await this.request<LlamaStackResponse>('/chat/completions', request);
    // Parse and return test plan
    return {
      unitTests: [],
      snapshots: [],
    };
  }

  /**
   * Generate unit tests
   */
  async generateUnitTests(context: ContextBundle, plan: TestPlan): Promise<GeneratedTests> {
    if (env.LLAMA_URL.includes('mock') || !env.LLAMA_API_KEY) {
      return {
        unitTests: {
          'src/__tests__/utils.test.ts': `import { describe, it, expect } from 'vitest';
import { processData } from '../utils';

describe('processData', () => {
  it('should process valid data', () => {
    expect(processData({ value: 1 })).toEqual({ processed: true });
  });
});`,
        },
        snapshots: {},
        metadata: {
          totalLines: 10,
          testCount: 1,
          snapshotCount: 0,
        },
      };
    }

    const request: LlamaStackRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a test generation assistant. Generate comprehensive unit tests.',
        },
        {
          role: 'user',
          content: `Generate unit tests for:\n\n${JSON.stringify(plan.unitTests, null, 2)}\n\nContext:\n${context.diff}`,
        },
      ],
      max_tokens: this.maxTokens,
    };

    const response = await this.request<LlamaStackResponse>('/chat/completions', request);
    // Parse and extract generated tests
    return {
      unitTests: {},
      snapshots: {},
      metadata: {
        totalLines: 0,
        testCount: 0,
        snapshotCount: 0,
      },
    };
  }

  /**
   * Generate snapshot tests
   */
  async generateSnapshots(context: ContextBundle, plan: TestPlan): Promise<Record<string, string>> {
    if (env.LLAMA_URL.includes('mock') || !env.LLAMA_API_KEY) {
      return {
        'src/__tests__/DataDisplay.snap.ts': `export const snapshot = {
  "component": "DataDisplay",
  "props": {},
  "rendered": "<div>...</div>"
};`,
      };
    }

    // Similar implementation to generateUnitTests
    return {};
  }

  /**
   * Self-critique generated tests
   */
  async selfCritique(tests: GeneratedTests, context: ContextBundle): Promise<{
    issues: string[];
    suggestions: string[];
  }> {
    if (env.LLAMA_URL.includes('mock') || !env.LLAMA_API_KEY) {
      return {
        issues: [],
        suggestions: ['Consider adding edge case tests'],
      };
    }

    const request: LlamaStackRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a code review assistant. Critique test code for quality and completeness.',
        },
        {
          role: 'user',
          content: `Review these tests:\n\n${JSON.stringify(tests, null, 2)}`,
        },
      ],
      tools: [selfCritiqueTool],
      max_tokens: this.maxTokens,
    };

    const response = await this.request<LlamaStackResponse>('/chat/completions', request);
    return {
      issues: [],
      suggestions: [],
    };
  }
}

