/**
 * Runtime path resolver for service-api imports
 * In production, service-api dist is copied to service-api-dist
 * This helper resolves the correct path at runtime
 */

export function resolveServiceApiPath(relativePath: string): string {
  // In Docker, service-api dist is copied to /app/service-api-dist
  // In local dev, it's at ../../service-api/dist
  const isDocker = process.env.NODE_ENV === 'production' && process.cwd() === '/app';
  
  if (isDocker) {
    // Remove the ../../../service-api prefix and use service-api-dist
    const path = relativePath.replace(/^\.\.\/\.\.\/\.\.\/service-api\//, '');
    return `/app/service-api-dist/${path}`;
  }
  
  // Local development - use relative path
  return relativePath;
}

