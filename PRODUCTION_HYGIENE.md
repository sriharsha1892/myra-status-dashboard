# Production Hygiene Guide

## Overview
This guide ensures production remains clean, monitored, and performant.

## ✅ Completed Setup

### 1. Monitoring & Observability
- **Sentry**: Error tracking configured (add `NEXT_PUBLIC_SENTRY_DSN` to enable)
- **Vercel Analytics**: User behavior tracking enabled automatically
- **Custom Analytics**: Event tracking via `lib/monitoring/analytics.ts`

### 2. Performance Monitoring
- Response time tracking in API routes
- Database query monitoring via Supabase
- Performance utilities in `lib/monitoring/performance.ts`

### 3. Error Handling
- 99% error handling coverage (4 priority routes)
- Graceful error messages for users
- Centralized error middleware

## 🔧 Regular Maintenance

### Weekly Tasks

**1. Clean Up Test Data**
```sql
-- Run in Supabase Dashboard → SQL Editor
-- See SEED_DATA_CLEANUP.sql for full queries
SELECT COUNT(*) FROM trial_organizations WHERE org_name ILIKE '%test%';
```

**2. Check Background Processes**
```bash
# Kill old processes
killall playwright 2>/dev/null
pkill -f "sleep 180" 2>/dev/null
```

**3. Review Error Logs**
- Sentry Dashboard: Check new errors
- Vercel Logs: Review API failures
- Supabase Logs: Monitor database issues

### Monthly Tasks

**1. Database Health**
```sql
-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text))
FROM pg_tables WHERE schemaname = 'public';

-- Clean old import sessions
DELETE FROM import_sessions WHERE created_at < NOW() - INTERVAL '30 days';
```

**2. Performance Review**
- Analyze slow API routes (>1s response time)
- Review database query performance
- Check for N+1 queries

**3. Security Audit**
- Update dependencies: `npm audit fix`
- Review Supabase RLS policies
- Rotate API keys if needed

## 📊 Key Metrics to Track

### User Engagement
- Active account managers per week
- Trials created vs converted
- Feature adoption rates
- Most used workflows

### Performance
- API response times (target: <500ms)
- Database query times (target: <200ms)
- Error rates (target: <1%)
- Uptime (target: 99.9%)

### Data Quality
- Parse confidence scores (target: >70% avg)
- Trial completion rates
- Feature request actionability

## 🚨 Alerts to Set Up

### Critical (Immediate Action)
- Error rate > 5%
- API response time > 2s
- Database connection failures
- Uptime < 99%

### Warning (Review Within 24h)
- Error rate > 1%
- Slow queries > 1s
- Failed imports > 10%
- Low parse confidence < 50%

## 🛠️ Tools Setup

### Sentry (Error Tracking)
1. Create account at sentry.io
2. Create new Next.js project
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
   ```
4. Deploy to Vercel

### Vercel Analytics
- Automatically enabled (already integrated)
- View at: vercel.com/dashboard → Analytics

### Database Monitoring
- Supabase Dashboard → Reports
- Set up query performance alerts
- Monitor connection pool usage

## 📝 Data Retention Policy

### Keep Forever
- Trial organizations
- Timeline events
- User data
- Conversion metrics

### Keep 90 Days
- Import sessions
- Parse confidence logs
- Performance metrics

### Keep 30 Days
- Error logs
- Debug traces
- Test data (delete sooner)

## 🔄 Deployment Checklist

Before each deployment:
- [ ] Run tests: `npm test`
- [ ] Check types: `npm run type-check`
- [ ] Review error handling
- [ ] Update CHANGELOG
- [ ] Tag release in git

After deployment:
- [ ] Monitor error rates (first hour)
- [ ] Check performance metrics
- [ ] Verify critical workflows
- [ ] Announce to team

## 💡 Best Practices

1. **Never commit secrets** - Use environment variables
2. **Always test migrations** - Use staging first
3. **Monitor after deploys** - Watch for 1 hour
4. **Keep dependencies updated** - Weekly reviews
5. **Document changes** - Update relevant docs

## 🆘 Emergency Procedures

### Production Down
1. Check Vercel status dashboard
2. Review recent deployments (rollback if needed)
3. Check database connection
4. Review error logs in Sentry

### Data Issues
1. Never delete directly in production
2. Export affected data first
3. Test fix in staging
4. Apply with transaction + rollback plan

### Performance Degradation
1. Identify slow endpoints (Vercel logs)
2. Check database query performance
3. Review recent code changes
4. Scale up if traffic spike

## 📞 Support Contacts

- **Vercel Support**: vercel.com/support
- **Supabase Support**: supabase.com/dashboard/support
- **Sentry Support**: sentry.io/support

---

Last Updated: 2025-11-16
