import { createHmac } from 'crypto';

/**
 * Verify GitHub webhook HMAC SHA-256 signature
 * @param body - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value (format: "sha256=<hash>")
 * @param secret - Webhook secret
 * @returns true if signature is valid
 */
export function verifyHmac(body: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');
  const receivedSignature = signature.substring(7); // Remove 'sha256=' prefix

  // Use constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }

  return result === 0;
}

