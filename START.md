# How to Start LlamaForge

Quick guide to start all LlamaForge services locally.

## Prerequisites Check

```bash
# Verify you have everything installed
node --version    # Should be v20+
pnpm --version    # Should be 8+
docker --version
docker-compose --version
```

## Step-by-Step Startup

### 1. Start Infrastructure Services (Redis & Postgres)

```bash
# Start Redis and Postgres in the background
docker-compose up -d

# Verify they're running
docker-compose ps
```

You should see:
```
NAME                STATUS
llamaforge-redis-1  Up
llamaforge-postgres-1 Up
```

### 2. Initialize Database

```bash
# Set database URL (if not already in .env)
export DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge

# Run migrations
./scripts/migrate.sh
```

### 3. Install Dependencies (if not done)

```bash
pnpm install
```

### 4. Build the Project

```bash
pnpm -w build
```

### 5. Start the Services

You need **3 terminal windows** - one for each service:

#### Terminal 1: Service API
```bash
pnpm --filter @llamaforge/service-api dev
```

You should see:
```
Service API listening on port 3000
```

#### Terminal 2: Worker
```bash
pnpm --filter @llamaforge/worker dev
```

You should see:
```
Worker started, waiting for jobs...
```

#### Terminal 3: GitHub App (Optional)
```bash
pnpm --filter @llamaforge/github-app dev
```

You should see:
```
GitHub App listening on port 3001
```

## Quick Start Script

Or use the automated script:

```bash
./scripts/test-local.sh
```

This will:
- Check prerequisites
- Start Docker services
- Install dependencies
- Build the project
- Run migrations
- Run tests

Then manually start the services in separate terminals as shown above.

## Verify Everything is Running

### Check Service Health

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

### Check Infrastructure

```bash
# Redis
docker-compose exec redis redis-cli ping
# Should return: PONG

# Postgres
docker-compose exec postgres pg_isready -U llamaforge
# Should return: postgres:5432 - accepting connections
```

## Test the System

### 1. Trigger a Test Job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_bot_api_token_12345" \
  -d '{
    "prUrl": "https://github.com/akram/llamaforge_test/pull/1",
    "testTypes": ["unit"]
  }'
```

### 2. Check Job Status

```bash
# Use the jobId from the response above
curl http://localhost:3000/jobs/<jobId>
```

### 3. Watch the Logs

- **Service API terminal**: Should show job enqueued
- **Worker terminal**: Should show job processing, test generation, etc.

## Troubleshooting

### Services won't start?

**Check environment variables:**
```bash
# Verify .env file exists and has all required variables
cat .env | grep -v "^#" | grep -v "^$"
```

**Check ports are available:**
```bash
lsof -i :3000  # Service API
lsof -i :3001  # GitHub App
lsof -i :6379  # Redis
lsof -i :5432  # Postgres
```

**Check Docker services:**
```bash
docker-compose ps
docker-compose logs redis
docker-compose logs postgres
```

### Database connection errors?

```bash
# Verify Postgres is running
docker-compose ps postgres

# Test connection
psql postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge -c "SELECT 1"

# Check DATABASE_URL in .env matches docker-compose.yml
```

### Redis connection errors?

```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check REDIS_URL in .env
```

### Import/module errors?

```bash
# Rebuild everything
pnpm -w build

# Check TypeScript compilation
pnpm -w typecheck
```

## Stopping Services

### Stop Application Services
Press `Ctrl+C` in each terminal running the services.

### Stop Infrastructure
```bash
docker-compose down
```

Or to remove volumes too:
```bash
docker-compose down -v
```

## Production Startup

For production, use Docker containers:

```bash
# Build images
pnpm -w docker:build

# Or use docker-compose with production config
docker-compose -f docker-compose.prod.yml up -d
```

## Next Steps

Once everything is running:
1. See [TESTING.md](TESTING.md) for detailed testing scenarios
2. See [TEST_REPO_SETUP.md](TEST_REPO_SETUP.md) to set up GitHub App
3. Create a test PR in `akram/llamaforge_test` to test the full flow

