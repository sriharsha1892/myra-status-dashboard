# myRA AI Status Dashboard

> Industry-leading real-time status monitoring dashboard for LLM providers in your multi-agent research orchestrator.

![myRA AI Status](https://img.shields.io/badge/myRA-AI%20Status-6366f1)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)

## 🌟 Features

- **Real-Time Monitoring** - SSE-powered live updates every 60 seconds
- **Multi-Provider Support** - Monitors OpenAI, Anthropic (Claude), Google Gemini, Exa AI, and Brave Search
- **Beautiful Liquid UI** - Modern, fluid design with glass morphism effects
- **Incident Tracking** - Detailed incident timelines and status histories
- **Embeddable Widget** - Drop-in component for your main application
- **Notification System** - Slack, Discord, and custom webhook integrations
- **No Database Required** - In-memory caching with automatic refresh
- **Professional Branding** - Custom myRA AI theming throughout

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📊 Monitored Providers

| Provider | Service | Status Page |
|----------|---------|-------------|
| **OpenAI** | GPT APIs | https://status.openai.com |
| **Anthropic** | Claude API | https://status.anthropic.com |
| **Google** | Gemini API | https://status.cloud.google.com |
| **Exa AI** | Search API | https://status.exa.ai |
| **Brave** | Search API | https://status.brave.com |

## 🎨 UI Components

### Main Dashboard

Full-featured status dashboard with:
- Overall system status indicator
- Provider status cards
- Incident timelines
- Real-time updates via SSE

Access at: `/status` or root `/`

### Embeddable Widget

Use the `StatusWidget` component in your main application:

```tsx
import StatusWidget from '@/components/StatusWidget';

// Compact version (minimal footprint)
<StatusWidget compact />

// Full version with provider list
<StatusWidget showProviders />

// With custom refresh interval
<StatusWidget autoRefresh refreshInterval={30000} />
```

## 🔌 API Endpoints

### GET `/api/status/current`

Get current status snapshot of all providers.

**Response:**
```json
{
  "providers": [...],
  "lastUpdated": "2025-10-23T10:00:00.000Z",
  "overallStatus": "operational"
}
```

### GET `/api/status/stream`

Server-Sent Events stream for real-time updates.

**Usage:**
```javascript
const eventSource = new EventSource('/api/status/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
};
```

### POST `/api/status/refresh`

Manually trigger cache refresh.

### POST `/api/notifications/configure`

Configure notification webhooks.

**Request Body:**
```json
{
  "slackWebhook": "https://hooks.slack.com/...",
  "discordWebhook": "https://discord.com/api/webhooks/...",
  "webhookUrl": "https://your-app.com/webhook"
}
```

## 🔔 Notifications

The dashboard supports automatic notifications when provider status changes.

### Slack Integration

```bash
curl -X POST http://localhost:3000/api/notifications/configure \
  -H "Content-Type: application/json" \
  -d '{
    "slackWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }'
```

### Discord Integration

```bash
curl -X POST http://localhost:3000/api/notifications/configure \
  -H "Content-Type: application/json" \
  -d '{
    "discordWebhook": "https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
  }'
```

### Custom Webhooks

Receive JSON payloads on status changes:

```json
{
  "type": "status_change",
  "changes": [
    {
      "provider": "OpenAI",
      "oldStatus": "operational",
      "newStatus": "degraded_performance",
      "timestamp": "2025-10-23T10:00:00.000Z",
      "message": "⚠️ OpenAI status changed..."
    }
  ],
  "timestamp": "2025-10-23T10:00:00.000Z"
}
```

## 🎨 Customization

### Branding

Update colors in `tailwind.config.ts`:

```typescript
colors: {
  myra: {
    primary: "#6366f1",    // Main brand color
    secondary: "#8b5cf6",  // Secondary accent
    accent: "#a78bfa",     // Tertiary accent
    dark: "#1e1b4b",       // Dark theme
    light: "#f5f3ff",      // Light backgrounds
  },
}
```

### Add More Providers

Edit `lib/providers.ts`:

```typescript
export const PROVIDERS: Provider[] = [
  // ... existing providers
  {
    id: 'new-provider',
    name: 'NewProvider',
    displayName: 'New Provider',
    statusPageUrl: 'https://status.newprovider.com',
    apiEndpoint: 'https://status.newprovider.com/api/v2/summary.json',
    color: '#ff6b6b',
  },
];
```

## 📁 Project Structure

```
myra-status-dashboard/
├── app/
│   ├── api/
│   │   ├── status/
│   │   │   ├── current/route.ts    # Current status endpoint
│   │   │   ├── stream/route.ts     # SSE stream
│   │   │   └── refresh/route.ts    # Manual refresh
│   │   └── notifications/
│   │       └── configure/route.ts   # Notification config
│   ├── status/
│   │   └── page.tsx                 # Main dashboard page
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home (redirects to /status)
│   └── globals.css                  # Global styles
├── components/
│   ├── StatusCard.tsx               # Provider status card
│   ├── StatusIndicator.tsx          # Status indicator dot
│   ├── StatusWidget.tsx             # Embeddable widget
│   ├── OverallStatus.tsx            # Overall status banner
│   └── IncidentTimeline.tsx         # Incident history
├── lib/
│   ├── types.ts                     # TypeScript types
│   ├── providers.ts                 # Provider configs
│   ├── status-fetcher.ts            # Status API client
│   ├── status-cache.ts              # In-memory cache
│   └── notifications.ts             # Notification service
└── public/                          # Static assets
```

## 🔧 Environment Variables

No environment variables required! The dashboard works out of the box.

Optional: Create `.env.local` for custom configurations:

```bash
# Optional: Default notification webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: 3-column grid layout
- **Tablet**: 2-column grid layout
- **Mobile**: Single column, optimized touch interactions

## ⚡ Performance

- **Initial Load**: < 1s
- **Update Interval**: 60s (configurable)
- **Cache TTL**: 60s
- **SSE Heartbeat**: 30s

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: Server-Sent Events (SSE)
- **Caching**: In-memory with singleton pattern
- **API**: RESTful + SSE

## 📝 License

MIT

## 🤝 Contributing

This dashboard was built for myRA AI's multi-agent research orchestrator. Feel free to adapt it for your needs!

## 💡 Tips

1. **Deployment**: Works on Vercel, Netlify, or any Node.js hosting
2. **Scaling**: For high traffic, consider Redis for caching instead of in-memory
3. **Monitoring**: Add your own analytics/monitoring tools
4. **Security**: Add authentication if exposing publicly

## 🔮 Future Enhancements

- [ ] Historical data storage (SQLite/PostgreSQL)
- [ ] Custom alert rules and thresholds
- [ ] Email notifications
- [ ] Mobile app
- [ ] Uptime percentage calculations
- [ ] SLA tracking
- [ ] Multi-language support

---

Built with ❤️ for myRA AI
