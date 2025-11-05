# Vercel Deployment Guide for myRA Status Dashboard

This guide will help you deploy your myRA AI Status Dashboard to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Access to your Supabase project
- GitHub repository connected to Vercel

## Step 1: Set Up Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add the following:

### Required Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mkkhwiyolmowomojvtel.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTIyODMsImV4cCI6MjA3NzY2ODI4M30.uoCYKKuWoD37SII2pq9PHkVQ9pWoFUO058rkvE24Pgw` | Supabase anonymous key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5MjI4MywiZXhwIjoyMDc3NjY4MjgzfQ.pI6BFTzH_Lo7ST9T7Gw6rAMtf4hd21HP_4Jbo4ng5R4` | Supabase service role key (server-side only) |

### How to Add Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **Settings** in the top navigation
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - Enter the **Key** (variable name)
   - Enter the **Value** (the value from the table above)
   - Select **Production**, **Preview**, and **Development** environments
   - Click **Save**

## Step 2: Configure Build Settings

Vercel should auto-detect Next.js, but verify these settings:

1. Go to **Settings** → **General**
2. Verify:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node.js Version**: 20.x (auto-detected from `.nvmrc`)

## Step 3: Deploy

### Option A: Deploy from Git (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Vercel configuration"
   git push origin main
   ```

2. Vercel will automatically detect the push and start building

3. Monitor the deployment:
   - Go to your Vercel dashboard
   - Click on your project
   - View the **Deployments** tab

### Option B: Manual Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Step 4: Verify Deployment

Once deployed, test these pages:

1. **Public Status Page**: `https://your-domain.vercel.app/status`
2. **Support Login**: `https://your-domain.vercel.app/support/login`
3. **Support Dashboard**: `https://your-domain.vercel.app/support/dashboard` (after login)

## Step 5: Run Database Migrations

After successful deployment, you'll need to run any pending migrations:

1. Go to your Supabase project SQL Editor
2. Run the timestamp tracking migration:
   - Open `/scripts/add-trial-timestamps.sql`
   - Copy and paste the SQL into Supabase SQL Editor
   - Execute

3. Run notification preferences migration:
   - Open `/scripts/create-notification-preferences-table.sql`
   - Execute in Supabase SQL Editor

## Troubleshooting

### Build Fails

**Problem**: Build exits with error code 1

**Solutions**:
1. Check environment variables are set correctly
2. Clear build cache: Deployments → ⋯ menu → Redeploy → Check "Clear build cache"
3. Check build logs for specific errors

### Missing Environment Variables

**Error**: `Error: Supabase URL or Anon Key is missing`

**Solution**: Double-check all three environment variables are added in Vercel Settings

### Database Connection Issues

**Error**: `Failed to connect to Supabase`

**Solutions**:
1. Verify Supabase project is active
2. Check firewall/RLS policies in Supabase
3. Verify environment variable values match your Supabase dashboard

### 404 Errors

**Problem**: Pages return 404 after deployment

**Solution**:
- Verify routing in `app/` directory
- Check Vercel deployment logs for route generation
- Ensure all dynamic routes are properly built

## Configuration Files

The following files configure your Vercel deployment:

- **`.nvmrc`**: Specifies Node.js version 20
- **`vercel.json`**: Vercel-specific configuration
- **`.env.local`**: Local environment variables (NOT committed to git)

## Custom Domain (Optional)

To add a custom domain:

1. Go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain
4. Follow DNS configuration instructions
5. Wait for DNS propagation (up to 48 hours)

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review Supabase connection status
3. Verify all environment variables are set
4. Check browser console for client-side errors
5. Review Vercel Functions logs for API errors

## Security Notes

- **Never commit** `.env.local` to git (already in `.gitignore`)
- The `SUPABASE_SERVICE_ROLE_KEY` has admin access - keep it secure
- Rotate keys if compromised via Supabase Dashboard → Settings → API

---

**Deployment Status**:
- ✅ Next.js 16.0.0 with Turbopack
- ✅ Supabase integration
- ✅ Environment variables configured
- ✅ Node.js 20.x specified
- ✅ Build optimized for production
