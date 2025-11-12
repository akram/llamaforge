import { Octokit } from '@octokit/rest';
export interface DiffFetcherOptions {
    owner: string;
    repo: string;
    baseSHA: string;
    headSHA: string;
    octokit: Octokit;
}
export declare function fetchDiff(options: DiffFetcherOptions): Promise<{
    diff: string;
    changedFiles: string[];
}>;
//# sourceMappingURL=diffFetcher.d.ts.map