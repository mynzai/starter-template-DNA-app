# AI SaaS Platform Setup Guide

This guide will help you set up the AI SaaS platform template with all required services and configurations.

## Prerequisites

- Node.js 18.0.0 or later
- npm 8.0.0 or later  
- PostgreSQL 14+ or access to a hosted PostgreSQL service
- Redis instance (optional, for rate limiting)

## Required API Keys

You'll need to obtain the following API keys:

### 1. OpenAI API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy the key (it starts with `sk-`)

### 2. Anthropic API Key  
1. Visit [Anthropic Console](https://console.anthropic.com/keys)
2. Create a new API key
3. Copy the key (it starts with `sk-ant-`)

### 3. Stripe Keys
1. Visit [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)
4. For webhooks, you'll also need the **Webhook signing secret**

### 4. Database Setup
Choose one of these options:

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql
brew services start postgresql

# Create database
createdb ai_saas_platform
```

#### Option B: Hosted Database (Recommended)
- **Supabase**: Free tier available, includes vector extensions
- **Railway**: Simple PostgreSQL hosting
- **PlanetScale**: MySQL alternative if preferred

## Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_saas_platform"

# AI Service Keys
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"
STRIPE_SECRET_KEY="sk_test_your_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Optional: Redis for rate limiting
REDIS_URL="redis://localhost:6379"
```

## Database Migration

Run the database migrations to set up your schema:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Optional: Seed with sample data
npx prisma db seed
```

## Stripe Webhook Setup

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows/Linux - download from https://stripe.com/docs/stripe-cli
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to your local development:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret from the output to your `.env.local` file.

## Vector Database Setup (for RAG)

If using the RAG features, you'll need to set up vector storage:

### Option A: Supabase (Recommended)
1. Create a Supabase project
2. Enable the vector extension in SQL editor:
```sql
create extension vector;
```

### Option B: Pinecone
1. Create a Pinecone account
2. Create an index with dimension 1536 (OpenAI embeddings)
3. Add Pinecone configuration to your environment:
```env
PINECONE_API_KEY="your-pinecone-key"
PINECONE_INDEX="ai-saas-platform"
PINECONE_ENVIRONMENT="us-west1-gcp"
```

## Development Workflow

1. Start the development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000` to see your application.

3. Test API endpoints:
   - `GET /api/health` - Health check
   - `POST /api/chat` - AI chat endpoint
   - `POST /api/auth/signin` - Authentication

## Testing Setup

Run the comprehensive test suite:

```bash
# Unit tests
npm run test

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage report
npm run test:coverage
```

## Production Deployment

### Environment Setup
1. Set up your production environment variables
2. Use strong, unique secrets for `NEXTAUTH_SECRET`
3. Configure production database and Redis instances

### Recommended Hosting Platforms
- **Vercel**: Optimized for Next.js (recommended)
- **Railway**: Full-stack with database hosting
- **AWS/Azure/GCP**: Enterprise deployments

### Stripe Production Mode
1. Switch to live Stripe keys in production
2. Set up production webhooks pointing to your live domain
3. Configure product catalog and pricing in Stripe Dashboard

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check your `DATABASE_URL` format
   - Ensure PostgreSQL is running
   - Verify network connectivity to hosted database

2. **API Key Issues**
   - Verify keys are correctly copied (no extra spaces)
   - Check API key permissions and quotas
   - Ensure keys are for the correct environment (test/live)

3. **Stripe Webhook Failures**
   - Verify webhook endpoint URL is accessible
   - Check webhook signing secret matches
   - Review webhook logs in Stripe Dashboard

4. **Vector Database Issues**
   - Ensure vector extension is enabled in PostgreSQL
   - Check embedding dimensions match (1536 for OpenAI)
   - Verify vector database credentials

### Getting Help

- Check the [GitHub Issues](https://github.com/your-repo/issues) for common problems
- Review the [documentation](https://your-docs-site.com)
- Join our [Discord community](https://discord.gg/your-server) for support

## Estimated Setup Time

- **Basic setup**: 15 minutes
- **With all integrations**: 30-45 minutes
- **Production deployment**: 1-2 hours

## Next Steps

After setup is complete:

1. Customize the UI theme and branding
2. Configure your AI model preferences
3. Set up monitoring and analytics
4. Add custom business logic
5. Configure backup and security policies

Happy building! 🚀