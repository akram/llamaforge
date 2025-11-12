import { describe, it, expect } from 'vitest';
import type { GitHubPRPayload, JobStatus } from './index.js';

describe('Types', () => {
  it('should have correct GitHubPRPayload structure', () => {
    const payload: GitHubPRPayload = {
      installationId: 123,
      repo: 'test-repo',
      owner: 'test-owner',
      prNumber: 1,
      headSHA: 'abc123',
      baseSHA: 'def456',
      htmlUrl: 'https://github.com/test-owner/test-repo/pull/1',
    };

    expect(payload.installationId).toBe(123);
    expect(payload.repo).toBe('test-repo');
  });

  it('should have correct JobStatus structure', () => {
    const status: JobStatus = {
      id: 'job-1',
      key: 'owner/repo:sha',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(status.status).toBe('pending');
  });
});

