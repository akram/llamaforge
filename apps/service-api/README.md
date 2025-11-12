# Service API

Fastify-based API service for PR test generation orchestration.

## Overview

This service receives webhook events, enqueues test generation jobs, and provides job status endpoints.

## Features

- ✅ Webhook event handling with HMAC verification
- ✅ BullMQ job queue integration
- ✅ Context building (diff fetching, coverage analysis)
- ✅ LlamaStack client integration
- ✅ Policy enforcement
- ✅ PR publishing with auto-repair

## Endpoints

- `POST /events/github` - Receive GitHub webhook events
- `POST /jobs` - Manually trigger test generation
- `GET /jobs/:id` - Get job status
- `GET /health` - Health check

See `openapi.yaml` for full API specification.

## Environment Variables

See root `.env.example` for all required variables.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Run production build
pnpm start
```

## Architecture

The service orchestrates the following flow:

1. **Webhook Reception** - Validates HMAC and enqueues jobs
2. **Context Building** - Fetches PR diff, related files, coverage
3. **Test Generation** - Calls LlamaStack to generate tests
4. **Policy Validation** - Ensures tests comply with repository policy
5. **Patch Application** - Writes tests, formats, runs smoke tests
6. **PR Publishing** - Creates branch, commits, opens PR

## Services

- `contextBuilder/` - Fetch PR context and build context bundle
- `llamastack/` - LlamaStack API client with tool calling
- `patchApplier/` - Write tests, format, run smoke tests
- `prPublisher/` - Create branches and open PRs
- `policyGuard/` - Validate against `.bot-policy.yml`
- `autoRepair/` - Attempt to fix formatting/import issues

