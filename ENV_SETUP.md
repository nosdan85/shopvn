# Environment Variables Setup Guide

## Quick Setup

### Vercel (Frontend)
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add the required variables listed in the **VERCEL (Frontend)** section below

### Render (Backend)
1. Go to Render Dashboard → Service → Environment
2. Add ALL variables listed in the **RENDER (Backend)** section below

---

## VERCEL (Frontend) - Environment Variables

### Required

- **NEXT_PUBLIC_API_URL** - Backend API URL
  - Production: `https://api.nosroblox.com`
  - Development/Local: `http://localhost:5000`
  - Note: This is exposed to the browser, so use public URLs only

- **NEXT_PUBLIC_APP_NAME** - Application name (default: `NosMarket`)

- **NEXT_PUBLIC_CURRENCY** - Currency code (default: `VND`)

- **NEXT_PUBLIC_DISCORD_CLIENT_ID** - Discord OAuth2 Client ID for login
  - Get from: Discord Developer Portal → Applications → Your App → OAuth2

- **NEXT_PUBLIC_DISCORD_REDIRECT_URI** - Discord login callback URL
  - Production: `https://nosroblox.com/auth/discord/callback`
  - Development: `http://localhost:5173/auth/discord/callback`

- **NEXT_PUBLIC_DISCORD_SERVER_INVITE** - Discord server invite link
  - Format: `https://discord.gg/xxxxx`

---

## RENDER (Backend) - Environment Variables

### CRITICAL (Must Have)

#### Database
- **MONGO_URI** - MongoDB connection string
  - Format: `mongodb+srv://username:password@cluster.mongodb.net/shopvn?retryWrites=true&w=majority`
  - Get from: MongoDB Atlas → Database → Connect → Connection String

#### Authentication
- **JWT_SECRET** - JWT signing key for access tokens
  - Minimum 32 characters, random string
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- **TOKEN_ENCRYPTION_KEY** - Token encryption key
  - 32 bytes (64 hex characters)
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### Discord Bot (for payment notifications and user management)
- **DISCORD_BOT_TOKEN** - Bot token
  - Get from: Discord Developer Portal → Applications → Your App → Token

- **DISCORD_CLIENT_ID** - OAuth2 Client ID
  - Get from: Discord Developer Portal → Applications → Your App → OAuth2

- **DISCORD_CLIENT_SECRET** - OAuth2 Client Secret
  - Get from: Discord Developer Portal → Applications → Your App → OAuth2

- **DISCORD_GUILD_ID** - Your Discord server ID
  - Right-click server in Discord → Copy Server ID

- **DISCORD_OWNER_ID** - Your Discord user ID
  - Right-click your username → Copy User ID

#### CORS Configuration
- **CLIENT_URL** - Frontend URL(s) for CORS
  - Format (comma-separated): `https://nosroblox.com,https://www.nosroblox.com`
  - Development: `http://localhost:5173`

- **BACKEND_URL** - Backend API URL
  - Production: `https://api.nosroblox.com`
  - Development: `http://localhost:5000`

### Payment Integration

#### Bank Transfer (SePay)
- **SEPAY_WEBHOOK_SECRET** - Webhook signature secret from SePay
  - Get from: SePay Dashboard → API Settings

- **SEPAY_MB_BANK_ACCOUNT** - MB Bank account number
  - Example: `0123456789`

- **SEPAY_ACCOUNT_NAME** - MB Bank account holder name
  - Example: `COMPANY NAME`

- **SEPAY_API_KEY** - SePay API key (optional, if needed)

#### Card Payment (GachTheFast)
- **GACHTHEFAST_API_URL** - Card service API URL
  - Default: `https://api.gachthefast.com`

- **GACHTHEFAST_PARTNER_ID** - Partner ID from card service

- **GACHTHEFAST_API_KEY** - API key from card service

#### Image Upload (ImgBB)
- **IMGBB_API_KEY** - ImgBB API key for image hosting
  - Get from: ImgBB → API → Your API Key

### Discord Channels (for notifications)
- **DISCORD_REDIRECT_URI** - Discord login redirect URL
  - Production: `https://nosroblox.com/auth/discord/callback`
  - Development: `http://localhost:5173/auth/discord/callback`

- **DISCORD_TICKET_CATEGORY_ID** - Support ticket category ID
  - Right-click category in Discord → Copy ID

- **DISCORD_VOUCH_CHANNEL_ID** - Vouch/review channel ID
  - Right-click channel in Discord → Copy ID

- **DISCORD_WALLET_NOTIFY_CHANNEL_ID** - Wallet notification channel ID
  - Right-click channel in Discord → Copy ID

- **DISCORD_OWNER_ROLE_ID** - Owner role ID (optional)
  - Right-click role in Discord → Copy ID

- **DISCORD_SERVER_INVITE** - Discord server invite link
  - Format: `https://discord.gg/xxxxx`

### Optional Configuration
- **NODE_ENV** - Environment type
  - Set to: `production` (for production), `development` (for local)

---

## Environment Files Overview

### Frontend (.env files location)
- **`web/.env.example`** - Example environment file for Next.js frontend
- **`web/.env.local`** - Local development environment (not committed to git)
- **`web/.env.production`** - Production environment (in Vercel dashboard)

### Backend (.env files location)
- **`api/.env.example`** - Example environment file for Express backend
- **`api/.env`** - Production environment (not committed to git)
- **`api/.env.local`** - Local development environment (not committed to git)

### Bot (.env files location)
- **`bot/.env.example`** - Example environment file for Discord bot
- **`bot/.env`** - Bot environment (not committed to git)

---

## How to Generate Secrets

### Generate JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Example output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Generate TOKEN_ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Strong Password
Use a password generator with:
- Minimum 8 characters
- Mix of uppercase and lowercase letters
- Numbers and special characters
- Example: `Pxq9@mK2nLp!`

---

## Setup Instructions

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopvn-main
   ```

2. **Frontend setup**
   ```bash
   cd web
   cp .env.example .env.local
   # Edit .env.local with your local values
   npm install
   npm run dev
   ```

3. **Backend setup**
   ```bash
   cd ../api
   cp .env.example .env.local
   # Generate secrets
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   # Edit .env.local with your values
   npm install
   npm run dev
   ```

4. **Discord Bot setup (optional)**
   ```bash
   cd ../bot
   cp .env.example .env
   # Edit .env with your Discord bot credentials
   npm install
   npm start
   ```

### Production Deployment on Render

1. **Connect GitHub repository to Render**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository

2. **Configure environment variables**
   - Click Environment tab
   - Add all variables from RENDER (Backend) section above

3. **Deploy**
   - Render will auto-deploy when you push to main branch

### Production Deployment on Vercel

1. **Connect GitHub repository to Vercel**
   - Go to Vercel Dashboard → New Project
   - Connect your GitHub repository (web folder)

2. **Configure environment variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from VERCEL (Frontend) section above

3. **Deploy**
   - Vercel will auto-deploy when you push to main branch

---

## Verification Checklist

### Backend Health Check
After deploying backend, verify:
1. API is running: `curl https://api.nosroblox.com/health`
2. Expected response: `{"status":"ok","...":"..."}`

### Frontend Health Check
After deploying frontend, verify:
1. Website loads: `https://nosroblox.com`
2. Can access all pages without API errors
3. Discord login works
4. Payment methods display correctly

### Environment Variable Verification
Run this script to verify all required variables are set:
```bash
# Backend check
echo "Checking backend environment..."
[ -z "$MONGO_URI" ] && echo "ERROR: MONGO_URI not set"
[ -z "$JWT_SECRET" ] && echo "ERROR: JWT_SECRET not set"
[ -z "$DISCORD_BOT_TOKEN" ] && echo "ERROR: DISCORD_BOT_TOKEN not set"
[ -z "$CLIENT_URL" ] && echo "ERROR: CLIENT_URL not set"
echo "All critical variables checked"
```

---

## Common Issues and Solutions

### Database Connection Error
**Error**: `MongoServerError: connect ECONNREFUSED`
**Solution**:
- Verify MONGO_URI is correct
- Check MongoDB Atlas whitelist includes Render IP
- Ensure MongoDB user has correct permissions

### JWT/Token Errors
**Error**: `JsonWebTokenError: invalid token` or `TokenExpiredError`
**Solution**:
- Verify JWT_SECRET is set on both frontend and backend
- Ensure TOKEN_ENCRYPTION_KEY is properly set
- Regenerate tokens and clear browser cache

### Discord Bot Not Responding
**Error**: Bot appears offline or commands don't work
**Solution**:
- Verify DISCORD_BOT_TOKEN is correct (should start with `MTk...`)
- Check bot has correct permissions in Discord server
- Ensure DISCORD_GUILD_ID and DISCORD_OWNER_ID are correct
- Restart bot service in Render dashboard

### CORS Errors
**Error**: `Access to XMLHttpRequest blocked by CORS policy`
**Solution**:
- Verify CLIENT_URL in backend matches frontend domain exactly
- Include both `https://example.com` and `https://www.example.com` if needed
- Clear browser cache and restart frontend

### Payment Methods Not Loading
**Error**: Card/Bank payment options not appearing
**Solution**:
- Check GACHTHEFAST_API_KEY or SEPAY_WEBHOOK_SECRET are set
- Verify payment service credentials are valid
- Check backend logs for payment service initialization errors

### Images Not Uploading
**Error**: `ImgBB API key invalid` or upload fails
**Solution**:
- Verify IMGBB_API_KEY is correct
- Check API key hasn't expired
- Ensure file size is under ImgBB limits

---

## Security Best Practices

1. **Never commit .env files** - Always use `.gitignore`
2. **Use strong secrets** - Minimum 32 characters for JWT_SECRET
3. **Rotate secrets regularly** - Consider updating JWT_SECRET every 90 days
4. **Use HTTPS** - All production URLs should be HTTPS
5. **Limit CORS** - Only include necessary domains in CLIENT_URL
6. **Protect Discord Bot Token** - Never share or expose in logs
7. **Use environment-specific values** - Different secrets for dev/prod
8. **Monitor logs** - Watch for unauthorized access attempts

---

## Environment Variables Summary Table

| Variable | Required | Type | Example |
|----------|----------|------|---------|
| MONGO_URI | Yes | Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| JWT_SECRET | Yes | Random String (32+ chars) | `a1b2c3d4...` |
| TOKEN_ENCRYPTION_KEY | Yes | Random String (32 bytes) | `a1b2c3d4...` |
| DISCORD_BOT_TOKEN | Yes | Discord Token | `MTk4...` |
| DISCORD_CLIENT_ID | Yes | Numeric ID | `123456789` |
| DISCORD_CLIENT_SECRET | Yes | Random String | `abc123def456...` |
| DISCORD_GUILD_ID | Yes | Numeric ID | `123456789` |
| CLIENT_URL | Yes | URL | `https://example.com` |
| BACKEND_URL | Yes | URL | `https://api.example.com` |
| SEPAY_WEBHOOK_SECRET | No | Random String | `secret123...` |
| SEPAY_MB_BANK_ACCOUNT | No | Account Number | `0123456789` |
| SEPAY_ACCOUNT_NAME | No | Name | `COMPANY NAME` |
| GACHTHEFAST_PARTNER_ID | No | String | `partner123` |
| GACHTHEFAST_API_KEY | No | String | `key123...` |
| IMGBB_API_KEY | No | String | `abc123def456...` |
| NEXT_PUBLIC_API_URL | Yes (Frontend) | URL | `https://api.example.com` |
| NEXT_PUBLIC_DISCORD_CLIENT_ID | Yes (Frontend) | Numeric ID | `123456789` |

---

## References

- [Render Environment Variables Documentation](https://render.com/docs/environment-variables)
- [Vercel Environment Variables Documentation](https://vercel.com/docs/environment-variables)
- [MongoDB Atlas Connection String](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
