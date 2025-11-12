# Quick Start Guide

Get LlamaForge running locally in 5 minutes.

## 1. Prerequisites Check

```bash
node --version  # Should be v20+
pnpm --version  # Should be 8+
docker --version
docker-compose --version
```

## 2. Setup

```bash
# Clone and install
git clone https://github.com/akram/llamaforge.git
cd llamaforge
pnpm install

# Configure environment (use mock mode for testing)
cp .env.example .env
# Edit .env and set:
# - DRY_RUN=true
# - LLAMA_URL=https://mock.llamastack.com/v1
# - LLAMA_API_KEY=any_value
```

## 3. Start Infrastructure

```bash
# Start Redis and Postgres
docker-compose up -d

# Initialize database
export DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge
./scripts/migrate.sh
```

## 4. Build

```bash
pnpm -w build
```

## 5. Run Services

Open 3 terminal windows:

**Terminal 1 - Service API:**
```bash
pnpm --filter @llamaforge/service-api dev
```

**Terminal 2 - Worker:**
```bash
pnpm --filter @llamaforge/worker dev
```

**Terminal 3 - GitHub App (optional):**
```bash
pnpm --filter @llamaforge/github-app dev
```

## 6. Test

### Health Check
```bash
curl http://localhost:3000/health
```

### Trigger Test Job
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_bot_token" \
  -d '{
    "prUrl": "https://github.com/owner/repo/pull/1",
    "testTypes": ["unit"]
  }'
```

### Check Job Status
```bash
# Use the jobId from the response above
curl http://localhost:3000/jobs/<jobId>
```

## What to Expect

With `DRY_RUN=true` and mock LlamaStack:
- ✅ Job will be enqueued
- ✅ Worker will process it
- ✅ Tests will be generated (mock data)
- ✅ No actual PR will be created
- ✅ Check worker logs to see the flow

## Next Steps

- Read [TESTING.md](TESTING.md) for detailed testing scenarios
- Configure real GitHub App for webhook testing
- Set `DRY_RUN=false` to create actual PRs (be careful!)

## Troubleshooting

**Services won't start?**
- Check Docker is running: `docker ps`
- Check ports aren't in use: `lsof -i :3000 -i :3001 -i :6379 -i :5432`

**Database errors?**
- Verify Postgres is running: `docker-compose ps`
- Check connection: `psql $DATABASE_URL -c "SELECT 1"`

**Redis errors?**
- Verify Redis is running: `docker-compose ps`
- Test connection: `redis-cli ping`

**Import errors?**
- Rebuild: `pnpm -w build`
- Check TypeScript: `pnpm -w typecheck`

