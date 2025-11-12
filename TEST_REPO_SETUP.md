# Test Repository Setup Guide

The test repository `akram/llamaforge_test` has been created and configured for testing LlamaForge.

## Repository Status

✅ Repository created: https://github.com/akram/llamaforge_test

## Files Created

- ✅ `.bot-policy.yml` - Bot configuration
- ✅ `README.md` - Repository documentation
- ✅ `package.json` - Node.js project setup
- ✅ `src/utils.ts` - Sample code for testing
- ✅ `vitest.config.ts` - Test framework configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.gitignore` - Git ignore rules
- ✅ `.github/workflows/ci.yml` - GitHub Actions CI workflow

## Next Steps: Setting Up Webhooks

To connect LlamaForge to this test repository, you need to:

### 1. Create a GitHub App

1. Go to https://github.com/settings/apps/new
2. Fill in the app details:
   - **GitHub App name**: `LlamaForge Test` (or any name)
   - **Homepage URL**: `https://github.com/akram/llamaforge`
   - **Webhook URL**: Your LlamaForge GitHub App service URL
     - For local testing with ngrok: `https://your-ngrok-url.ngrok.io/webhooks`
     - For production: Your deployed service URL
   - **Webhook secret**: Use the same value as `GITHUB_WEBHOOK_SECRET` in your `.env`

3. **Set Permissions** (Repository permissions):
   - Contents: Read & Write
   - Pull requests: Read & Write
   - Issues: Read & Write
   - Checks: Read
   - Metadata: Read (automatic)
   - Actions: Read

4. **Subscribe to events**:
   - Pull requests

5. Click "Create GitHub App"

6. **Generate a private key**:
   - Scroll to "Private keys"
   - Click "Generate a private key"
   - Download the `.pem` file
   - Copy the key content to your `.env` as `GITHUB_PRIVATE_KEY`

7. **Note your App ID**:
   - The App ID is shown on the app settings page
   - Add it to your `.env` as `GITHUB_APP_ID`

### 2. Install the App on Test Repository

1. Go to your GitHub App settings
2. Click "Install App"
3. Select "Only select repositories"
4. Choose `akram/llamaforge_test`
5. Click "Install"
6. **Note the Installation ID** from the URL or API
   - URL format: `https://github.com/settings/installations/{INSTALLATION_ID}`
   - Add it to your `.env` as `GITHUB_INSTALLATION_ID`

### 3. Update Your .env File

Update your local `.env` file with the real values:

```bash
GITHUB_APP_ID=<your-app-id>
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
GITHUB_INSTALLATION_ID=<installation-id>
```

### 4. For Local Testing with ngrok

1. Install ngrok: https://ngrok.com/download

2. Start your GitHub App service:
   ```bash
   pnpm --filter @llamaforge/github-app dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3001
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Update your GitHub App webhook URL:
   - Go to your GitHub App settings
   - Update "Webhook URL" to: `https://abc123.ngrok.io/webhooks`
   - Save changes

### 5. Test the Setup

1. **Create a test branch and PR**:
   ```bash
   git clone https://github.com/akram/llamaforge_test.git
   cd llamaforge_test
   git checkout -b test-feature
   # Edit src/utils.ts - add a new function
   git add .
   git commit -m "Add test function"
   git push origin test-feature
   # Create PR on GitHub
   ```

2. **Trigger LlamaForge**:
   - The webhook should fire automatically when you open the PR
   - Check your GitHub App logs to see the webhook received
   - Check Service API logs to see the job enqueued
   - Check Worker logs to see test generation

3. **Verify**:
   - A new PR should be created with generated tests
   - The original PR should have a comment with a link to the test PR

## Testing Checklist

- [ ] GitHub App created
- [ ] App installed on `llamaforge_test` repository
- [ ] Webhook URL configured (ngrok for local or production URL)
- [ ] `.env` file updated with real credentials
- [ ] All services running (GitHub App, Service API, Worker)
- [ ] Test PR created in `llamaforge_test`
- [ ] Webhook received (check GitHub App logs)
- [ ] Job enqueued (check Service API logs)
- [ ] Test generation completed (check Worker logs)
- [ ] Test PR created by bot

## Troubleshooting

**Webhook not received:**
- Verify ngrok is running and URL is correct
- Check GitHub App webhook URL matches ngrok URL
- Verify `GITHUB_WEBHOOK_SECRET` matches in both places
- Check GitHub App event subscriptions include "Pull requests"

**Job not processing:**
- Verify Redis is running: `docker-compose ps`
- Check Worker is running and connected to Redis
- Verify job was enqueued: Check Service API logs

**Test generation fails:**
- Check Worker logs for errors
- Verify LlamaStack API key is set (or mock mode is enabled)
- Check repository has `.bot-policy.yml`
- Verify test directories exist or are in allowed paths

## Repository URL

https://github.com/akram/llamaforge_test

