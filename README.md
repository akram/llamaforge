# LlamaForge

**PR Test Generator** - Automated test generation for GitHub PRs using LlamaStack.

## Overview

LlamaForge is a production-ready system that automatically generates unit tests and snapshot tests for GitHub pull requests. When a PR is opened or updated, the system:

1. Analyzes the PR diff and related code
2. Generates comprehensive tests using LlamaStack
3. Validates tests against repository policies
4. Creates a follow-up PR with the generated tests

## Architecture

```
┌─────────────┐
│ GitHub App  │ (Webhook Receiver)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Service API │ (Orchestration)
└──────┬──────┘
       │
       ├──► BullMQ Queue
       │
       ▼
┌─────────────┐
│   Worker    │ (Test Generation)
└──────┬──────┘
       │
       ├──► LlamaStack API
       ├──► GitHub API
       └──► Repository Clone
```

### Components

- **GitHub App** (`apps/github-app`): Receives webhooks, validates signatures, forwards events
- **Service API** (`apps/service-api`): REST API for job management and orchestration
- **Worker** (`apps/worker`): Processes test generation jobs asynchronously
- **Shared Packages** (`packages/`): Common types and configuration

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (for local Redis/Postgres)
- GitHub App credentials
- LlamaStack API key

### Local Development

1. **Clone and install:**

```bash
git clone https://github.com/akram/llamaforge.git
cd llamaforge
pnpm install
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start dependencies:**

```bash
./scripts/local-dev.sh
```

4. **Run services:**

```bash
# Terminal 1: GitHub App
pnpm --filter @llamaforge/github-app dev

# Terminal 2: Service API
pnpm --filter @llamaforge/service-api dev

# Terminal 3: Worker
pnpm --filter @llamaforge/worker dev
```

### Building

```bash
# Build all packages
pnpm -w build

# Build specific app
pnpm --filter @llamaforge/service-api build
```

### Testing

```bash
# Run all tests
pnpm -w test

# Run tests for specific package
pnpm --filter @llamaforge/types test
```

## Environment Variables

See `.env.example` for all required variables. Key variables:

- `GITHUB_APP_ID`: Your GitHub App ID
- `GITHUB_PRIVATE_KEY`: RSA private key (PEM format)
- `GITHUB_WEBHOOK_SECRET`: Webhook secret
- `LLAMA_URL`: LlamaStack API URL
- `LLAMA_API_KEY`: LlamaStack API key
- `REDIS_URL`: Redis connection string
- `DATABASE_URL`: PostgreSQL connection string
- `DRY_RUN`: Set to `true` to disable PR creation (for testing)

## Deployment

### OpenShift/Kubernetes

1. **Build and push images:**

```bash
# Build images
pnpm -w docker:build

# Tag and push (example)
docker tag llamaforge-service-api:latest ghcr.io/akram/llamaforge/service-api:latest
docker push ghcr.io/akram/llamaforge/service-api:latest
```

2. **Configure secrets:**

Edit `deploy/kustomize/base/secrets.example.yaml` and create actual secrets:

```bash
kubectl create secret generic llamaforge-secrets \
  --from-literal=github-app-id='...' \
  --from-literal=github-private-key='...' \
  # ... etc
```

3. **Deploy:**

```bash
# Development
kubectl apply -k deploy/kustomize/overlays/dev

# Production
kubectl apply -k deploy/kustomize/overlays/prod
```

### Docker Compose (Local)

```bash
docker-compose up -d
```

## Repository Policy

Create a `.bot-policy.yml` file in your repository to configure test generation:

```yaml
allowedPaths:
  - __tests__
  - tests
forbiddenGlobs:
  - "**/node_modules/**"
maxDiffLines: 5000
testFramework: vitest
requireDeterminism: true
maxPRSize: 500
```

See `.bot-policy.yml.example` for full schema.

## API Documentation

The Service API exposes:

- `POST /events/github` - Receive webhook events
- `POST /jobs` - Manually trigger test generation
- `GET /jobs/:id` - Get job status
- `GET /health` - Health check

See `apps/service-api/openapi.yaml` for full OpenAPI specification.

## GitHub App Permissions

The GitHub App requires:

- **Contents**: Read & Write (to clone and commit)
- **Pull Requests**: Read & Write (to read PRs and create test PRs)
- **Issues**: Read & Write (to comment on PRs)
- **Checks**: Read (to read CI status)
- **Actions**: Read (to download coverage artifacts)

See `apps/github-app/src/perms/permissions.md` for details.

## Workflow

1. **PR Event** → GitHub App receives webhook
2. **Validation** → HMAC signature verified, event forwarded to Service API
3. **Job Enqueue** → Service API creates BullMQ job with idempotency key
4. **Context Building** → Worker fetches PR diff, related files, coverage
5. **Test Generation** → LlamaStack generates tests (analysis → plan → generate → critique)
6. **Policy Validation** → Tests validated against `.bot-policy.yml`
7. **Patch Application** → Tests written, formatted, smoke tests run
8. **Auto-Repair** → If smoke tests fail, attempt formatting fixes
9. **PR Publishing** → Branch created, tests committed, PR opened
10. **Notification** → Comment added to original PR with test PR link

## Security

- All webhooks verified with HMAC SHA-256
- Installation tokens used (no PATs)
- Non-root containers (distroless base images)
- Network policies restrict pod-to-pod communication
- Secrets managed via Kubernetes Secrets (use External Secrets Operator in production)
- Read-only root filesystem where possible

## Observability

- Structured logging (JSON format)
- Job status tracking in PostgreSQL
- Health check endpoints
- Prometheus metrics (TODO: add instrumentation)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm -w test && pnpm -w lint`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file.

## Testing Locally

For detailed testing instructions, see [TESTING.md](TESTING.md).

Quick test setup:

```bash
# Run automated test setup
./scripts/test-local.sh

# Or manually:
docker-compose up -d              # Start Redis & Postgres
pnpm install                      # Install dependencies
pnpm -w build                     # Build all packages
./scripts/migrate.sh              # Initialize database

# Start services (in separate terminals):
pnpm --filter @llamaforge/service-api dev
pnpm --filter @llamaforge/worker dev
pnpm --filter @llamaforge/github-app dev
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/akram/llamaforge/issues
- Documentation: See app-level READMEs in `apps/*/README.md`
- Testing Guide: See [TESTING.md](TESTING.md)

