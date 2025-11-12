import { describe, it, expect } from 'vitest';
import { verifyHmac } from './verifyHmac.js';
import { createHmac } from 'crypto';

describe('verifyHmac', () => {
  const secret = 'test-secret';
  const body = 'test-body';

  it('should verify valid HMAC signature', () => {
    const hash = createHmac('sha256', secret).update(body).digest('hex');
    const signature = `sha256=${hash}`;

    expect(verifyHmac(body, signature, secret)).toBe(true);
  });

  it('should reject invalid HMAC signature', () => {
    const signature = 'sha256=invalid-hash';

    expect(verifyHmac(body, signature, secret)).toBe(false);
  });

  it('should reject signature without sha256= prefix', () => {
    const hash = createHmac('sha256', secret).update(body).digest('hex');

    expect(verifyHmac(body, hash, secret)).toBe(false);
  });
});

