import { Octokit } from '@octokit/rest';
export interface RelatedFilesOptions {
    owner: string;
    repo: string;
    changedFiles: string[];
    ref: string;
    octokit: Octokit;
}
/**
 * Fetch related files (same module/package) for changed files
 * This is a simplified implementation - in production, use AST analysis
 * to find imports/exports and related modules
 */
export declare function fetchRelatedFiles(options: RelatedFilesOptions): Promise<Record<string, string>>;
//# sourceMappingURL=relatedFiles.d.ts.map