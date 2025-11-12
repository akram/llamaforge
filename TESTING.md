# Testing LlamaForge Locally

This guide walks you through testing the LlamaForge system locally.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (for Redis and Postgres)
- ngrok or similar tool (for webhook testing)
- GitHub App credentials (optional for full testing)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure Services

Start Redis and Postgres using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. For local testing, you can use:

```bash
# GitHub App (optional - can use mock mode)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=test_webhook_secret
GITHUB_INSTALLATION_ID=

# Service API
SERVICE_HMAC_SECRET=test_service_secret
BOT_API_TOKEN=test_bot_api_token_12345
PORT=3000
NODE_ENV=development

# LlamaStack (use mock mode for testing)
LLAMA_URL=https://mock.llamastack.com/v1
LLAMA_API_KEY=mock_key
LLAMA_MODEL=llama-3.1-70b
LLAMA_MAX_TOKENS=4096

# Queue & Database
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge

# Feature Flags
DRY_RUN=true  # Set to true to prevent actual PR creation

# Observability
LOG_LEVEL=debug
```

### 4. Initialize Database

Run database migrations:

```bash
export DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge
./scripts/migrate.sh
```

Or manually:

```bash
psql postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge -c "
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_error TEXT,
  result JSONB
);
CREATE INDEX IF NOT EXISTS idx_jobs_key ON jobs(key);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
"
```

### 5. Build the Project

```bash
pnpm -w build
```

## Running Services

Open multiple terminal windows/tabs:

### Terminal 1: Service API

```bash
pnpm --filter @llamaforge/service-api dev
```

The API will be available at `http://localhost:3000`

### Terminal 2: Worker

```bash
pnpm --filter @llamaforge/worker dev
```

The worker will start processing jobs from the queue.

### Terminal 3: GitHub App (Optional)

```bash
pnpm --filter @llamaforge/github-app dev
```

The GitHub App will be available at `http://localhost:3001`

## Testing Scenarios

### 1. Health Checks

Test that all services are running:

```bash
# Service API
curl http://localhost:3000/health

# GitHub App (if running)
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","service":"service-api"}
```

### 2. Manual Job Trigger

Trigger a test generation job manually:

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_bot_api_token_12345" \
  -d '{
    "prUrl": "https://github.com/your-org/your-repo/pull/123",
    "testTypes": ["unit", "snapshot"]
  }'
```

Expected response:
```json
{"jobId":"your-org/your-repo:manual-123-1234567890","status":"enqueued"}
```

### 3. Check Job Status

```bash
curl http://localhost:3000/jobs/your-org/your-repo:manual-123-1234567890
```

### 4. Test Webhook Flow (Full Integration)

#### 4.1. Set up ngrok for webhook testing

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

This will give you a public URL like `https://abc123.ngrok.io`

#### 4.2. Configure GitHub App Webhook

1. Go to your GitHub App settings
2. Set webhook URL to: `https://abc123.ngrok.io/webhooks`
3. Set webhook secret to match `GITHUB_WEBHOOK_SECRET` in your `.env`

#### 4.3. Simulate a PR Event

You can manually trigger a webhook event:

```bash
# Generate HMAC signature
SECRET="test_webhook_secret"
BODY='{"action":"opened","pull_request":{"number":123,"head":{"sha":"abc123"},"base":{"sha":"def456"},"html_url":"https://github.com/owner/repo/pull/123"},"repository":{"name":"repo","owner":{"login":"owner"}},"installation":{"id":123456}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
SIGNATURE="sha256=$SIGNATURE"

# Send webhook to GitHub App
curl -X POST http://localhost:3001/webhooks \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-delivery-id" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$BODY"
```

Or use the GitHub App to forward to Service API:

```bash
# The GitHub App will forward to Service API
# Check Service API logs to see the job being enqueued
```

### 5. Test LlamaStack Client (Mock Mode)

With `LLAMA_URL=https://mock.llamastack.com/v1`, the client will return deterministic fixtures. Test this:

```bash
# Create a test script
cat > test-llama.js << 'EOF'
import { LlamaStackClient } from './apps/service-api/src/services/llamastack/client.js';

const client = new LlamaStackClient();
const context = {
  diff: 'diff --git a/src/utils.ts b/src/utils.ts\n+export function test() {}',
  changedFiles: ['src/utils.ts'],
  relatedFiles: {},
  existingTests: {},
  styleRules: { framework: 'vitest', testDir: '__tests__', importStyle: 'esm', formatter: 'prettier' },
  publicAPIs: [],
};

const result = await client.analyzeDiff(context);
console.log('Analysis result:', result);
EOF

node test-llama.js
```

### 6. Test Policy Guard

Create a test policy file:

```bash
cat > test-repo/.bot-policy.yml << 'EOF'
allowedPaths:
  - __tests__
forbiddenGlobs:
  - "**/node_modules/**"
maxDiffLines: 1000
testFramework: vitest
requireDeterminism: true
maxPRSize: 500
EOF
```

Test policy loading:

```bash
node -e "
import { loadPolicy } from './apps/service-api/src/services/policyGuard/policy.js';
const policy = await loadPolicy('./test-repo');
console.log('Policy loaded:', policy);
"
```

### 7. End-to-End Test (DRY_RUN Mode)

With `DRY_RUN=true`, the system will generate tests but not create PRs:

1. Start all services (Service API, Worker)
2. Trigger a job via API
3. Watch worker logs to see:
   - Context building
   - Test generation (using mock LlamaStack)
   - Policy validation
   - Test writing
   - Smoke test execution
   - PR creation skipped (DRY_RUN mode)

Check logs:

```bash
# In worker terminal, you should see:
# - "Building context..."
# - "Generating tests..."
# - "Validating policy..."
# - "Writing tests..."
# - "[DRY_RUN] Would push branch..."
```

## Unit Tests

Run unit tests:

```bash
# All tests
pnpm -w test

# Specific package
pnpm --filter @llamaforge/types test
pnpm --filter @llamaforge/github-app test
```

## Integration Testing

### Test Webhook → Job Flow

1. Start Service API and Worker
2. Send a webhook event (see section 4.3)
3. Verify job appears in queue:

```bash
# Connect to Redis
redis-cli
> KEYS *
> GET "bull:pr-test-generation:your-org/your-repo:abc123"
```

4. Check database:

```bash
psql postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge -c "SELECT * FROM jobs;"
```

## Debugging

### Check Service Logs

All services log to stdout with structured JSON. Look for:
- `"level":"error"` - Errors
- `"level":"warn"` - Warnings
- `"level":"info"` - Info messages
- `"level":"debug"` - Debug details (when LOG_LEVEL=debug)

### Common Issues

1. **Redis connection failed**
   - Check: `docker-compose ps` - Redis should be running
   - Verify: `REDIS_URL=redis://localhost:6379`

2. **Database connection failed**
   - Check: `docker-compose ps` - Postgres should be running
   - Verify: `DATABASE_URL` matches docker-compose settings
   - Run migrations: `./scripts/migrate.sh`

3. **HMAC signature verification failed**
   - Ensure `GITHUB_WEBHOOK_SECRET` matches in all services
   - Check signature generation in webhook test

4. **Worker not processing jobs**
   - Verify Redis connection
   - Check worker logs for errors
   - Verify job was enqueued: `redis-cli KEYS "bull:*"`

5. **LlamaStack client errors**
   - In mock mode, ensure `LLAMA_URL` contains "mock"
   - Check API key is set (can be any value in mock mode)

## Testing with Real GitHub

To test with a real GitHub repository:

1. Create a GitHub App:
   - Go to https://github.com/settings/apps/new
   - Set webhook URL to your ngrok URL
   - Grant required permissions (see `apps/github-app/src/perms/permissions.md`)
   - Install on a test repository

2. Update `.env`:
   ```bash
   GITHUB_APP_ID=<your-app-id>
   GITHUB_PRIVATE_KEY="<your-private-key>"
   GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
   GITHUB_INSTALLATION_ID=<installation-id>
   ```

3. Set `DRY_RUN=false` to actually create PRs (be careful!)

4. Open a test PR in your repository
5. The webhook will trigger the flow automatically

## Next Steps

- Review generated test code quality
- Adjust LlamaStack prompts in `apps/service-api/src/services/llamastack/prompts.ts`
- Customize policy rules in `.bot-policy.yml`
- Add more test scenarios
- Set up monitoring and observability

