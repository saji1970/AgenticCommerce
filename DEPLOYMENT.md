# Deployment Guide

## Railway Deployment

This project is configured for deployment on [Railway](https://railway.app/).

### Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI installed: `npm install -g @railway/cli`
3. PostgreSQL and Redis databases (can be provisioned on Railway)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Initialize Railway Project

```bash
railway init
```

### Step 4: Add PostgreSQL Database

```bash
railway add postgresql
```

This will provision a PostgreSQL database and set the `DATABASE_URL` environment variable.

### Step 5: Add Redis

```bash
railway add redis
```

This will provision a Redis instance and set the `REDIS_URL` environment variable.

### Step 6: Set Environment Variables

Set all required environment variables in Railway:

```bash
railway variables set ANTHROPIC_API_KEY=your_api_key
railway variables set STRIPE_SECRET_KEY=your_stripe_key
railway variables set STRIPE_PUBLISHABLE_KEY=your_stripe_pub_key
railway variables set JWT_SECRET=your_jwt_secret
railway variables set MCP_SERVER_URLS=http://retailer1.com,http://retailer2.com
railway variables set NODE_ENV=production
```

Or use the Railway dashboard to set variables through the UI.

### Step 7: Deploy

```bash
railway up
```

This will build and deploy your backend service.

### Step 8: Get Your App URL

```bash
railway domain
```

This shows your app's public URL.

## Environment Variables Reference

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway)
- `REDIS_URL` - Redis connection string (auto-set by Railway)
- `ANTHROPIC_API_KEY` - Your Anthropic Claude API key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `JWT_SECRET` - Secret key for JWT tokens (generate a secure random string)

### Optional Variables

- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (auto-set by Railway, defaults to 3000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `MCP_SERVER_URLS` - MCP server URLs (comma-separated)
- `LOG_LEVEL` - Logging level (info/debug/error)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Database Migrations

After deployment, run migrations to set up the database schema:

```bash
railway run npm run migrate
```

## Monitoring

View logs in real-time:

```bash
railway logs
```

Or view in the Railway dashboard.

## Scaling

Railway supports automatic scaling. Configure in the Railway dashboard:
- Navigate to your service
- Go to Settings → Autoscaling
- Configure min/max instances and resource limits

## CI/CD

Railway automatically deploys when you push to your connected Git repository:

1. Connect your GitHub repository in Railway dashboard
2. Select the branch to deploy (e.g., `main`)
3. Every push to that branch triggers a new deployment

## Mobile App Configuration

After backend deployment, update your mobile app environment variables:

```
EXPO_PUBLIC_API_URL=https://your-app.railway.app/api/v1
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
```

## Troubleshooting

### Build Fails

- Check Railway build logs for errors
- Ensure all dependencies are listed in package.json
- Verify Node version compatibility

### Database Connection Issues

- Verify DATABASE_URL is set correctly
- Check database is running in Railway dashboard
- Ensure database credentials are correct

### API Not Responding

- Check health endpoint: `https://your-app.railway.app/health`
- Review application logs: `railway logs`
- Verify environment variables are set

## Security Checklist

- [ ] JWT_SECRET is a strong random string
- [ ] All API keys are set as environment variables (never in code)
- [ ] ALLOWED_ORIGINS is properly configured for your frontend
- [ ] Stripe keys are production keys (for production deployment)
- [ ] Database has strong password
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced (Railway does this automatically)

## Backup and Recovery

Railway provides automatic backups for PostgreSQL. To manually backup:

```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

To restore:

```bash
railway run psql $DATABASE_URL < backup.sql
```
