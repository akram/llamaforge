import type { LlamaTool } from '@llamaforge/types';

/**
 * Tool definitions for LlamaStack function calling
 */

export const analyzeDiffTool: LlamaTool = {
  type: 'function',
  function: {
    name: 'analyze_diff',
    description: 'Analyze a code diff and extract public APIs, dependencies, and testing needs',
    parameters: {
      type: 'object',
      properties: {
        publicAPIs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['function', 'class', 'interface', 'type'] },
              file: { type: 'string' },
              signature: { type: 'string' },
            },
            required: ['name', 'type', 'file'],
          },
        },
        summary: { type: 'string' },
        complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['publicAPIs', 'summary'],
    },
  },
};

export const planTestsTool: LlamaTool = {
  type: 'function',
  function: {
    name: 'plan_tests',
    description: 'Create a test plan with unit tests and snapshots',
    parameters: {
      type: 'object',
      properties: {
        unitTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              target: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['file', 'target', 'description', 'priority'],
          },
        },
        snapshots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              target: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['file', 'target', 'description'],
          },
        },
      },
      required: ['unitTests', 'snapshots'],
    },
  },
};

export const generateUnitTestsTool: LlamaTool = {
  type: 'function',
  function: {
    name: 'generate_unit_tests',
    description: 'Generate unit test code for specified targets',
    parameters: {
      type: 'object',
      properties: {
        tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['file', 'content'],
          },
        },
      },
      required: ['tests'],
    },
  },
};

export const generateSnapshotsTool: LlamaTool = {
  type: 'function',
  function: {
    name: 'generate_snapshots',
    description: 'Generate snapshot test files',
    parameters: {
      type: 'object',
      properties: {
        snapshots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['file', 'content'],
          },
        },
      },
      required: ['snapshots'],
    },
  },
};

export const selfCritiqueTool: LlamaTool = {
  type: 'function',
  function: {
    name: 'self_critique',
    description: 'Critique generated tests for quality, completeness, and correctness',
    parameters: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['error', 'warning', 'info'] },
              message: { type: 'string' },
              file: { type: 'string' },
              line: { type: 'number' },
            },
            required: ['severity', 'message'],
          },
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['issues', 'suggestions'],
    },
  },
};

