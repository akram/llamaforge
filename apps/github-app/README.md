# GitHub App

Webhook receiver and GitHub App integration for LlamaForge.

## Overview

This service receives GitHub webhooks, validates HMAC signatures, and forwards PR events to the Service API for processing.

## Features

- ✅ Webhook signature verification (HMAC SHA-256)
- ✅ Replay attack prevention (timestamp validation)
- ✅ Pull request event handling (opened, synchronize, reopened)
- ✅ Installation token management via Octokit App
- ✅ Secure forwarding to Service API with HMAC signing

## Environment Variables

See root `.env.example` for all required variables. Key variables:

- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_PRIVATE_KEY`: RSA private key (PEM format)
- `GITHUB_WEBHOOK_SECRET`: Webhook secret for signature verification
- `SERVICE_API_URL`: URL of the Service API (default: http://localhost:3000)
- `SERVICE_HMAC_SECRET`: Secret for signing requests to Service API
- `PORT`: Server port (default: 3001)

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

## Webhook Endpoints

- `POST /webhooks`: Receives GitHub webhooks
- `GET /health`: Health check endpoint

## Security

- All webhooks are verified using HMAC SHA-256
- Events older than 5 minutes are rejected (replay protection)
- Installation tokens are automatically managed by Octokit App
- No long-lived credentials stored

## Permissions

See `src/perms/permissions.md` for detailed permission requirements.

