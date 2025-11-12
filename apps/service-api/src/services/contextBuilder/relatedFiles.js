/**
 * Fetch related files (same module/package) for changed files
 * This is a simplified implementation - in production, use AST analysis
 * to find imports/exports and related modules
 */
export async function fetchRelatedFiles(options) {
    const { owner, repo, changedFiles, ref, octokit } = options;
    const relatedFiles = {};
    // For each changed file, find files in the same directory
    const directories = new Set(changedFiles.map((file) => {
        const parts = file.split('/');
        parts.pop();
        return parts.join('/');
    }));
    for (const dir of directories) {
        try {
            // Get directory contents
            const { data: contents } = await octokit.repos.getContent({
                owner,
                repo,
                path: dir,
                ref,
            });
            if (Array.isArray(contents)) {
                for (const item of contents) {
                    if (item.type === 'file' && !changedFiles.includes(item.path)) {
                        // Only fetch source files (not tests)
                        if (item.path.endsWith('.ts') ||
                            item.path.endsWith('.tsx') ||
                            item.path.endsWith('.js') ||
                            item.path.endsWith('.jsx')) {
                            try {
                                const { data: fileData } = await octokit.repos.getContent({
                                    owner,
                                    repo,
                                    path: item.path,
                                    ref,
                                });
                                if ('content' in fileData && fileData.encoding === 'base64') {
                                    relatedFiles[item.path] = Buffer.from(fileData.content, 'base64').toString('utf-8');
                                }
                            }
                            catch (error) {
                                // Skip files that can't be read
                                console.warn(`Failed to read ${item.path}:`, error);
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            // Directory might not exist or be accessible
            console.warn(`Failed to list directory ${dir}:`, error);
        }
    }
    return relatedFiles;
}
//# sourceMappingURL=relatedFiles.js.map