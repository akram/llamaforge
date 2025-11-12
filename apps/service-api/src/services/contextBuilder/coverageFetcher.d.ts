import { Octokit } from '@octokit/rest';
import type { CoverageReport } from '@llamaforge/types';
export interface CoverageFetcherOptions {
    owner: string;
    repo: string;
    ref: string;
    octokit: Octokit;
}
/**
 * Fetch coverage report from GitHub Actions artifacts
 * Falls back to parsing coverage files in the repository
 */
export declare function fetchCoverageReport(options: CoverageFetcherOptions): Promise<CoverageReport | undefined>;
//# sourceMappingURL=coverageFetcher.d.ts.map