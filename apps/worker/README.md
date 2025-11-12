# Worker

BullMQ worker for processing PR test generation jobs.

## Overview

This worker consumes jobs from the `pr-test-generation` queue and orchestrates the end-to-end test generation process.

## Features

- ✅ BullMQ worker with concurrency control
- ✅ Job status tracking in PostgreSQL
- ✅ Full test generation pipeline
- ✅ Error handling and retries
- ✅ Graceful shutdown

## Job Flow

1. **Context Building** - Fetch PR diff, related files, coverage
2. **Test Generation** - Call LlamaStack to generate tests
3. **Policy Validation** - Ensure compliance with `.bot-policy.yml`
4. **Patch Application** - Write tests, format, run smoke tests
5. **Auto-Repair** - Attempt to fix formatting/import issues
6. **PR Publishing** - Create branch, commit, open PR
7. **Notification** - Comment on original PR

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

## Database Schema

The worker maintains job status in PostgreSQL:

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_error TEXT,
  result JSONB
);
```

## Error Handling

- Failed jobs are retried with exponential backoff (3 attempts)
- Job status is persisted to database
- Errors are logged and commented on original PR
- Temporary directories are cleaned up on failure

