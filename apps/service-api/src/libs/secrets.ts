/**
 * Secrets management utilities
 * In production, integrate with:
 * - Kubernetes Secrets
 * - External Secrets Operator
 * - HashiCorp Vault
 * - AWS Secrets Manager
 * - etc.
 */

export function getSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Secret ${name} is not set`);
  }
  return value;
}

export function getSecretOptional(name: string): string | undefined {
  return process.env[name];
}

