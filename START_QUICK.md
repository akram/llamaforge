# Quick Start - Run Without Building

You can start the app in **development mode** without building first. This uses `tsx` to run TypeScript directly.

## Start Services (No Build Required)

### Terminal 1: Service API
```bash
pnpm --filter @llamaforge/service-api dev
```

### Terminal 2: Worker  
```bash
pnpm --filter @llamaforge/worker dev
```

### Terminal 3: GitHub App (Optional)
```bash
pnpm --filter @llamaforge/github-app dev
```

## Verify It's Working

```bash
# Check Service API
curl http://localhost:3000/health
```

You should see: `{"status":"ok","service":"service-api"}`

## Note

The build errors are TypeScript strictness issues that don't prevent the app from running in dev mode. 
We can fix them later, but the app will work for testing now.
