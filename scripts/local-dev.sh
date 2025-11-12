#!/bin/bash
set -e

echo "Starting LlamaForge local development environment..."

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Start Redis and Postgres
echo "Starting Redis and Postgres..."
docker-compose up -d redis postgres

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check if .env exists
if [ ! -f .env ]; then
  echo "Warning: .env file not found. Copying from .env.example..."
  cp .env.example .env
  echo "Please update .env with your actual values before continuing."
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build packages
echo "Building packages..."
pnpm -w build

# Run database migrations
echo "Running database migrations..."
./scripts/migrate.sh

echo ""
echo "Local development environment is ready!"
echo ""
echo "To start services:"
echo "  - GitHub App:     pnpm --filter @llamaforge/github-app dev"
echo "  - Service API:    pnpm --filter @llamaforge/service-api dev"
echo "  - Worker:         pnpm --filter @llamaforge/worker dev"
echo ""
echo "To stop services:"
echo "  docker-compose down"

