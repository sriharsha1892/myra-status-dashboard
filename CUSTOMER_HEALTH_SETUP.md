# Customer Health Scoring System

## Overview

The Customer Health Scoring System provides a **one-page view** of organization health, enabling admins and account managers to quickly identify at-risk customers and take proactive action.

## Features

### 🎯 **Health Score (0-100)**
Composite score based on:
- **Engagement (35%)** - Login frequency, activity patterns
- **Support (30%)** - Open tickets, priority levels, response times
- **Feature Usage (20%)** - Adoption of available features
- **Responsiveness (15%)** - Customer communication patterns

### 📊 **Visual Indicators**
- **Color-coded status**: Healthy (green), Warning (yellow), At-Risk (orange), Critical (red)
- **Trend indicators**: Improving ↗, Stable →, Declining ↘
- **Activity timeline**: 7-day visual graph of login patterns
- **Health breakdown bars**: Individual metric visualization

### 💡 **Smart Recommendations**
AI-powered suggestions based on:
- Trial expiration dates
- Ticket priorities and age
- Engagement drops
- Communication patterns
- Historical churn indicators

### ⚡ **Quick Actions**
One-click buttons for:
- Call customer
- Send email
- Extend trial
- Schedule meeting
- Assign tickets

## Database Schema Requirements

### Required Columns on `organizations` table:

```sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_outreach TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_response TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_health
ON organizations(status, last_activity, trial_end_date);
```

### Optional: Activity Logging Table

For production use, create an activity logging table:

```sql
CREATE TABLE IF NOT EXISTS org_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  login_count INT DEFAULT 0,
  actions_count INT DEFAULT 0,
  features_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date)
);

CREATE INDEX IF NOT EXISTS idx_org_activity_logs_org_date
ON org_activity_logs(org_id, date DESC);
```

### Tracking Features Used

```sql
CREATE TABLE IF NOT EXISTS org_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INT DEFAULT 1,
  UNIQUE(org_id, feature_name)
);
```

## Usage

### Basic Integration

```tsx
import CustomerHealthCard from '@/components/support/CustomerHealthCard';
import { analyzeOrganizationHealth } from '@/lib/health-scoring';

// In your component
const healthAnalysis = analyzeOrganizationHealth(
  organization,
  tickets,
  activityLogs,
  featuresUsed,
  lastOutreach,
  lastResponse
);

<CustomerHealthCard
  orgId={org.id}
  orgName={org.name}
  orgStatus={org.status}
  accountManager={org.account_manager}
  healthAnalysis={healthAnalysis}
  recentTickets={tickets}
  activityLogs={activityLogs}
  onCallCustomer={() => {/* handle call */}}
  onSendEmail={() => {/* handle email */}}
  onExtendTrial={() => {/* handle extend */}}
  onScheduleMeeting={() => {/* handle meeting */}}
  onAssignTicket={(id) => {/* handle assign */}}
/>
```

### Integrating into Organization Detail Page

Replace existing organization view with health card:

```tsx
// app/support/organizations/[id]/page.tsx
import { redirect } from 'next/navigation';

export default function OrgDetailPage({ params }: { params: { id: string } }) {
  redirect(`/support/organizations/${params.id}/health`);
}
```

### Account Manager Dashboard

Show "My Organizations" filtered view:

```tsx
// Get user's assigned orgs
const { data: myOrgs } = await supabase
  .from('organizations')
  .select('*')
  .eq('account_manager', userEmail);

// Calculate health for each
const orgsWithHealth = await Promise.all(
  myOrgs.map(async (org) => {
    const tickets = await fetchTickets(org.id);
    const activity = await fetchActivity(org.id);
    const health = analyzeOrganizationHealth(org, tickets, activity, ...);
    return { org, health };
  })
);

// Sort by health score (worst first)
orgsWithHealth.sort((a, b) => a.health.metrics.overall - b.health.metrics.overall);
```

## Health Score Calculation

### Engagement Score (0-100)

**Calculation:**
```javascript
// Expected logins per day
const expected = orgType === 'trial' ? 2 : 3;

// Calculate average over last 7 days
const avgLogins = totalLogins / 7;

// Base score
let score = (avgLogins / expected) * 100;

// Penalties:
// - No activity last 3 days: -70%
// - Low activity last 3 days: -40%
// - 50%+ drop in activity: -30%
```

**Thresholds:**
- 80-100: Highly engaged (green)
- 60-79: Moderate engagement (yellow)
- 40-59: Low engagement (orange)
- 0-39: At risk (red)

### Support Score (0-100)

**Calculation:**
```javascript
// Start at 100 (perfect)
let score = 100;

// Deduct for open tickets based on priority and age:
// Critical: -40 if >4h, -25 if >2h, -15 if >1h
// High: -30 if >24h, -20 if >12h, -10 if >6h
// Medium: -20 if >48h, -10 if >24h
// Low: -10 if >72h
```

**Thresholds:**
- No open tickets: 100 (perfect)
- Critical tickets open >4h: Major deduction
- Multiple high priority tickets: Compounds

### Feature Usage Score (0-100)

**Calculation:**
```javascript
const score = (featuresUsed.length / totalAvailableFeatures) * 100;

// Example: Using 3 of 10 features = 30%
```

**Thresholds:**
- 80-100: Power user (green)
- 60-79: Good adoption (yellow)
- 40-59: Limited usage (orange)
- 0-39: Barely using (red)

### Responsiveness Score (0-100)

**Calculation:**
```javascript
if (noOutreachYet) return 100; // No outreach = no concern

if (respondedToLatest) return 100; // Responded = perfect

// Deduct based on days without response:
// >7 days: 0
// 5-7 days: 20
// 3-5 days: 50
// 1-3 days: 80
// <1 day: 100
```

### Overall Score (Weighted Average)

```javascript
overall =
  (engagement × 0.35) +
  (support × 0.30) +
  (featureUsage × 0.20) +
  (responsiveness × 0.15);
```

## Risk Levels

**Critical (0-39)**
- Immediate intervention required
- High churn probability
- Escalate to leadership

**High Risk (40-59)**
- Needs attention within 24 hours
- Clear decline in engagement
- Multiple concerning signals

**Medium Risk (60-79)**
- Monitor closely
- Proactive check-in recommended
- Address issues before they compound

**Low Risk (80-100)**
- Healthy customer
- Maintain current approach
- Celebrate and reinforce

## Recommendations Engine

### Logic Flow

```javascript
if (trialEnding && lowEngagement) {
  recommend("Call today to discuss blockers");
  recommend("Consider extending trial");
}

if (criticalTicket) {
  recommend("Escalate to engineering immediately");
  recommend("Call customer to acknowledge");
}

if (lowEngagement) {
  recommend("Schedule onboarding call");
  recommend("Send feature highlights email");
}

if (notResponding) {
  recommend("Try calling instead of email");
  recommend("Verify contact is still at company");
}
```

### Customization

Add your own rules in `lib/health-scoring.ts`:

```typescript
export function generateRecommendations(
  organization: Organization,
  tickets: Ticket[],
  engagement: number,
  support: number,
  responsiveness: number
): string[] {
  const recommendations: string[] = [];

  // Add your custom logic here
  if (organization.industry === 'healthcare' && engagement < 50) {
    recommendations.push("Offer HIPAA compliance consultation");
  }

  return recommendations;
}
```

## Best Practices

### For Account Managers

1. **Check health scores daily** (takes 1 minute)
2. **Act on critical/at-risk customers first**
3. **Log all outreach** (updates responsiveness score)
4. **Follow recommended actions**
5. **Celebrate improvements** (share wins with team)

### For Admins

1. **Review team performance weekly**
2. **Identify struggling account managers**
3. **Spot systemic issues** (multiple orgs with same problem)
4. **Adjust weights** if needed (customize scoring)
5. **Track correlation** (health score vs actual churn)

### Data Quality

1. **Log activity consistently** (every user action)
2. **Track feature usage** (not just logins)
3. **Record all outreach** (emails, calls, meetings)
4. **Update ticket status promptly**
5. **Keep contact info current**

## Performance Considerations

### Caching

Health scores can be cached since they don't need real-time precision:

```typescript
// Calculate once per hour per org
const cacheKey = `health:${orgId}:${new Date().getHours()}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const health = analyzeOrganizationHealth(...);
await redis.setex(cacheKey, 3600, JSON.stringify(health));
```

### Batch Calculation

For dashboard views (100+ orgs):

```typescript
// Calculate in parallel
const healthScores = await Promise.all(
  orgs.map(org => analyzeOrganizationHealth(org, ...))
);

// Or use worker queues for large datasets
```

## Roadmap

Future enhancements:

- [ ] Machine learning model (predict churn probability)
- [ ] Sentiment analysis on ticket content
- [ ] Automated email templates based on health
- [ ] Slack notifications for critical drops
- [ ] Historical health tracking (trend charts)
- [ ] Benchmark against industry averages
- [ ] Integration with CRM (Salesforce, HubSpot)
- [ ] Mobile app for health monitoring

## Support

For questions or issues:
1. Check this documentation
2. Review example implementation in `app/support/organizations/[id]/health/page.tsx`
3. Examine scoring logic in `lib/health-scoring.ts`
4. Customize component in `components/support/CustomerHealthCard.tsx`

## License

Internal use only. Do not distribute outside organization.
