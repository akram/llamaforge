# Environment Variables Setup Guide

This guide explains how to configure all required environment variables for LlamaForge.

## Quick Setup for Local Testing

For local testing, you can use placeholder/mock values. Copy `.env.example` and update with these values:

```bash
cp .env.example .env
```

Then edit `.env` with these **test values**:

```bash
# GitHub App (placeholder values for local testing)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=test_webhook_secret_12345

# Service API (any random strings work for local testing)
SERVICE_HMAC_SECRET=test_service_hmac_secret_12345
BOT_API_TOKEN=test_bot_api_token_12345

# LlamaStack (mock mode - no real API needed)
LLAMA_URL=https://mock.llamastack.com/v1
LLAMA_API_KEY=mock_api_key_for_testing

# Database (matches docker-compose.yml)
DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge
```

## Required Variables Explained

### GitHub App Variables

**GITHUB_APP_ID**
- **What**: Your GitHub App's numeric ID
- **How to get**: 
  1. Go to https://github.com/settings/apps
  2. Create a new GitHub App or select existing one
  3. The App ID is shown on the app's settings page
- **For local testing**: Use `123456` (any number works, but real API calls will fail)

**GITHUB_PRIVATE_KEY**
- **What**: RSA private key for GitHub App authentication
- **How to get**:
  1. In your GitHub App settings, scroll to "Private keys"
  2. Click "Generate a private key"
  3. Download the `.pem` file
  4. Copy the entire key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`
  5. Replace newlines with `\n` in the .env file
- **For local testing**: Use a placeholder (real API calls will fail)
  ```
  GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
  ```

**GITHUB_WEBHOOK_SECRET**
- **What**: Secret for verifying webhook signatures
- **How to get**:
  1. In GitHub App settings, go to "Webhook" section
  2. Generate a webhook secret (or use any random string)
  3. Copy the secret
- **For local testing**: Use any random string like `test_webhook_secret_12345`

**GITHUB_INSTALLATION_ID** (optional)
- **What**: Installation ID when app is installed on a repository
- **How to get**: Install your app on a repository, then check the installation ID in the URL or via API
- **For local testing**: Can be left empty

### Service API Variables

**SERVICE_HMAC_SECRET**
- **What**: Secret for signing requests between GitHub App and Service API
- **How to get**: Generate any random secure string
- **For local testing**: Use `test_service_hmac_secret_12345`

**BOT_API_TOKEN**
- **What**: Bearer token for authenticating manual job triggers
- **How to get**: Generate any random secure string
- **For local testing**: Use `test_bot_api_token_12345`

### LlamaStack Variables

**LLAMA_URL**
- **What**: Base URL for LlamaStack API
- **How to get**: Get from your LlamaStack account or documentation
- **For local testing**: Use `https://mock.llamastack.com/v1` (enables mock mode)

**LLAMA_API_KEY**
- **What**: API key for LlamaStack authentication
- **How to get**: Get from your LlamaStack account dashboard
- **For local testing**: Use `mock_api_key_for_testing` (any value works in mock mode)

**LLAMA_MODEL** (optional, has default)
- **What**: Model name to use
- **Default**: `llama-3.1-70b`

**LLAMA_MAX_TOKENS** (optional, has default)
- **What**: Maximum tokens for API calls
- **Default**: `4096`

### Database & Queue Variables

**REDIS_URL**
- **What**: Redis connection string
- **How to get**: Use the docker-compose default
- **For local testing**: `redis://localhost:6379`

**DATABASE_URL**
- **What**: PostgreSQL connection string
- **How to get**: Use the docker-compose default
- **For local testing**: `postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge`

### Feature Flags

**DRY_RUN**
- **What**: If true, prevents actual PR creation
- **For local testing**: Set to `true` for safety

**LOG_LEVEL** (optional)
- **What**: Logging verbosity
- **Options**: `debug`, `info`, `warn`, `error`
- **For local testing**: Use `debug` to see detailed logs

## Quick Test Configuration

Here's a minimal `.env` that will work for local testing:

```bash
# Minimal test configuration
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=test_secret
SERVICE_HMAC_SECRET=test_hmac_secret
BOT_API_TOKEN=test_token
LLAMA_URL=https://mock.llamastack.com/v1
LLAMA_API_KEY=mock_key
DATABASE_URL=postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge
REDIS_URL=redis://localhost:6379
DRY_RUN=true
LOG_LEVEL=debug
```

## Generating Secure Secrets

For production, generate secure random secrets:

```bash
# Generate random secrets
openssl rand -hex 32  # For SERVICE_HMAC_SECRET
openssl rand -hex 32  # For BOT_API_TOKEN
openssl rand -hex 32  # For GITHUB_WEBHOOK_SECRET
```

## Verifying Configuration

After setting up `.env`, verify it's loaded correctly:

```bash
# Check if variables are set (they won't show values for security)
node -e "require('dotenv').config(); console.log('GITHUB_APP_ID:', process.env.GITHUB_APP_ID ? 'SET' : 'MISSING')"
```

Or test the service startup:

```bash
# This will validate all env vars
pnpm --filter @llamaforge/service-api dev
```

## Troubleshooting

**"Required" errors:**
- Make sure `.env` file exists in the project root
- Check that variable names match exactly (case-sensitive)
- Verify no extra spaces or quotes around values (except for multi-line values like private keys)

**"Invalid" errors:**
- Check URL formats (must start with `http://` or `https://`)
- Verify numeric values are actually numbers
- Check that private key includes `\n` for newlines

**Database connection errors:**
- Ensure Postgres is running: `docker-compose ps`
- Verify DATABASE_URL matches docker-compose.yml settings
- Check database exists: `psql $DATABASE_URL -c "SELECT 1"`

