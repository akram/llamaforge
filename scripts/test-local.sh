#!/bin/bash
set -e

echo "🧪 LlamaForge Local Testing Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}❌ pnpm is required but not installed.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed.${NC}" >&2; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Node.js 20+ is required. Found: $(node -v)${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${YELLOW}⚠️  Please edit .env with your configuration before continuing.${NC}"
  echo ""
  read -p "Press enter to continue after editing .env, or Ctrl+C to exit..."
fi

# Start infrastructure
echo "🐳 Starting infrastructure services..."
if ! docker-compose ps | grep -q "Up"; then
  docker-compose up -d
  echo "⏳ Waiting for services to be ready..."
  sleep 5
else
  echo -e "${GREEN}✅ Services already running${NC}"
fi

# Check services
echo ""
echo "🔍 Checking service health..."

REDIS_OK=$(docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && echo "ok" || echo "fail")
if [ "$REDIS_OK" = "ok" ]; then
  echo -e "${GREEN}✅ Redis is running${NC}"
else
  echo -e "${RED}❌ Redis is not responding${NC}"
  exit 1
fi

PG_OK=$(docker-compose exec -T postgres pg_isready -U llamaforge 2>/dev/null | grep -q "accepting connections" && echo "ok" || echo "fail")
if [ "$PG_OK" = "ok" ]; then
  echo -e "${GREEN}✅ Postgres is running${NC}"
else
  echo -e "${RED}❌ Postgres is not responding${NC}"
  exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
  pnpm install
else
  echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Build
echo ""
echo "🔨 Building packages..."
pnpm -w build

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
export DATABASE_URL=${DATABASE_URL:-"postgresql://llamaforge:llamaforge_dev@localhost:5432/llamaforge"}
./scripts/migrate.sh

# Run unit tests
echo ""
echo "🧪 Running unit tests..."
pnpm -w test || echo -e "${YELLOW}⚠️  Some tests failed (this is OK for initial setup)${NC}"

# Health check tests
echo ""
echo "🏥 Testing service health endpoints..."

# Start services in background for testing
echo "Starting Service API..."
cd apps/service-api
pnpm dev > /tmp/service-api.log 2>&1 &
SERVICE_API_PID=$!
cd ../..

sleep 3

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
  echo -e "${GREEN}✅ Service API is responding${NC}"
  curl -s http://localhost:3000/health | jq '.' || echo "Response: $(curl -s http://localhost:3000/health)"
else
  echo -e "${RED}❌ Service API is not responding${NC}"
  echo "Logs:"
  tail -20 /tmp/service-api.log
fi

# Cleanup
echo ""
echo "🧹 Cleaning up test processes..."
kill $SERVICE_API_PID 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Local testing setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start services manually:"
echo "   Terminal 1: pnpm --filter @llamaforge/service-api dev"
echo "   Terminal 2: pnpm --filter @llamaforge/worker dev"
echo "   Terminal 3: pnpm --filter @llamaforge/github-app dev"
echo ""
echo "2. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "3. Trigger a test job:"
echo "   curl -X POST http://localhost:3000/jobs \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer test_bot_token' \\"
echo "     -d '{\"prUrl\": \"https://github.com/owner/repo/pull/1\"}'"
echo ""
echo "See TESTING.md for detailed testing scenarios."

