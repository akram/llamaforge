# GitHub App Permissions

This document outlines the exact permissions required for the LlamaForge GitHub App.

## Required Permissions

### Repository Permissions

- **Contents**: Read & Write
  - Required to: Clone repositories, read file contents, create branches, commit test files
  - Scope: Repository-level access to code

- **Pull Requests**: Read & Write
  - Required to: Read PR details, fetch diffs, create PRs with generated tests, add comments
  - Scope: Full PR lifecycle management

- **Issues**: Read & Write
  - Required to: Read issue context, add comments to original PRs with test PR links
  - Scope: Issue and PR comment management

- **Checks**: Read
  - Required to: Read CI check status to understand test coverage and existing test results
  - Scope: Read-only access to check runs

- **Metadata**: Read
  - Required to: Access repository metadata (always granted, cannot be revoked)
  - Scope: Basic repository information

- **Actions**: Read
  - Required to: Download coverage artifacts from GitHub Actions workflows
  - Scope: Read-only access to workflow artifacts

## Installation

The app should be installed on repositories where automated test generation is desired. Installation can be:
- Organization-wide (recommended for teams)
- Repository-specific (for individual projects)

## Security Considerations

- The app uses installation tokens (JWT-based) with automatic expiration
- No Personal Access Tokens (PATs) are used
- All API calls respect repository branch protection rules
- The app never force-pushes or bypasses branch protections
- All commits are made by the bot user with clear attribution

## Permission Matrix

| Permission | Read | Write | Required For |
|------------|------|-------|--------------|
| Contents | ✅ | ✅ | Clone, read files, commit tests |
| Pull Requests | ✅ | ✅ | Read PRs, create test PRs |
| Issues | ✅ | ✅ | Read context, add comments |
| Checks | ✅ | ❌ | Read CI status |
| Metadata | ✅ | ❌ | Repository info |
| Actions | ✅ | ❌ | Download artifacts |

## Least Privilege Principle

This permission set follows the principle of least privilege:
- Write access is only granted where necessary (Contents, Pull Requests, Issues)
- Read access is granted for context gathering (Checks, Actions)
- No admin or destructive permissions are requested

