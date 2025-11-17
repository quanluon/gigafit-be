# Backend Environment Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# ==============================================
# GigaFit Backend Environment Configuration
# ==============================================

# Application Settings
NODE_ENV=development
PORT=3000
API_PREFIX=api

# ==============================================
# Database Configuration
# ==============================================

# MongoDB Atlas or Local
MONGODB_URI=mongodb://localhost:27017/gigafit
MONGODB_URI_TEST=mongodb://localhost:27017/gigafit-test

# ==============================================
# Redis Configuration (Cache & Session)
# ==============================================

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ==============================================
# AWS Services
# ==============================================

# AWS Region
AWS_REGION=us-east-1

# AWS Cognito Authentication
AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_COGNITO_CLIENT_ID=your-client-id-here
AWS_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX

# AWS S3 Storage (for user uploads, exercise videos, etc.)
AWS_S3_BUCKET=gigafit-storage
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# ==============================================
# JWT Configuration
# ==============================================

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRATION=3600

# Refresh Token
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=604800

# ==============================================
# AI Services
# ==============================================

# OpenAI API (for workout plan generation)
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Recommended models:
# - gpt-4o-mini (fast, cost-effective, recommended for development)
# - gpt-4o (more capable, higher cost)
# - gpt-3.5-turbo (legacy, cheaper)
OPENAI_MODEL=gpt-4o-mini

# Anthropic Claude (alternative AI provider)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# AI Provider Selection (openai or anthropic)
AI_PROVIDER=openai

# ==============================================
# CORS Configuration
# ==============================================

# Allowed origins (comma-separated for multiple)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# ==============================================
# Logging & Monitoring
# ==============================================

# Log Level (error, warn, info, debug)
LOG_LEVEL=debug

# Sentry DSN (for error tracking in production)
SENTRY_DSN=

# ==============================================
# Telegram Notifications (Optional)
# ==============================================

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_FEEDBACK_ENABLED=false

# ==============================================
# Rate Limiting
# ==============================================

# Rate limit window (milliseconds)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# Email Service (Optional - for notifications)
# ==============================================

# SendGrid, AWS SES, or similar
EMAIL_SERVICE_API_KEY=
EMAIL_FROM=noreply@gigafit.app
```

## Quick Start

1. Copy the above content to a new `.env` file:
   ```bash
   cp ENV_SETUP.md .env
   # Then edit .env and remove the markdown formatting
   ```

2. Or create `.env` manually with your values

3. **Required for Development:**
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Any random 32+ character string
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI service key

4. **Required for Production:**
   - All AWS Cognito settings
   - Strong JWT secrets
   - Production MongoDB URI
   - Redis connection
   - S3 bucket credentials

## Environment-Specific Files

- `.env` - Local development
- `.env.test` - Testing environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Security Notes

⚠️ **NEVER commit `.env` files to git!**
✅ The `.gitignore` file already excludes `.env` files
✅ Change all secrets before deploying to production
✅ Use different secrets for each environment
✅ Rotate secrets regularly in production

