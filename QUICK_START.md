# myRA AI Status Dashboard - Quick Start Guide

## ✅ Dashboard is Live!

Your industry-leading status dashboard is now running at:
**http://localhost:3002**

## 🎯 What You've Got

### 1. **Main Dashboard** (`/status` or `/`)
- Real-time status monitoring for 5 LLM providers
- Beautiful liquid design with glass morphism
- Live incident tracking
- Auto-refresh every 60 seconds via SSE

### 2. **Provider Monitoring**
- ✅ OpenAI (GPT APIs)
- ✅ Anthropic (Claude)
- ✅ Google (Gemini)
- ✅ Exa AI
- ⚠️  Brave Search (API endpoint needs verification)

### 3. **Embeddable Widget**
Drop this into your main orchestrator app:

```tsx
import StatusWidget from '@/myra-status-dashboard/components/StatusWidget';

// Minimal compact version
<StatusWidget compact />

// Full version with all providers
<StatusWidget showProviders />
```

### 4. **API Endpoints**

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/status/current` | Get current status snapshot | GET |
| `/api/status/stream` | Real-time SSE updates | GET |
| `/api/status/refresh` | Force cache refresh | POST |
| `/api/notifications/configure` | Setup alerts | POST |

## 🔔 Setting Up Notifications

### Slack
```bash
curl -X POST http://localhost:3002/api/notifications/configure \
  -H "Content-Type: application/json" \
  -d '{"slackWebhook": "YOUR_SLACK_WEBHOOK_URL"}'
```

### Discord
```bash
curl -X POST http://localhost:3002/api/notifications/configure \
  -H "Content-Type: application/json" \
  -d '{"discordWebhook": "YOUR_DISCORD_WEBHOOK_URL"}'
```

### Custom Webhook
```bash
curl -X POST http://localhost:3002/api/notifications/configure \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-app.com/webhook"}'
```

## 📝 Commands

```bash
# Development
npm run dev        # Start dev server (port 3002)

# Production
npm run build      # Build for production
npm start          # Start production server

# Linting
npm run lint       # Run ESLint
```

## 🔧 Configuration

### Change Port
```bash
PORT=3003 npm run dev
```

### Add More Providers
Edit `lib/providers.ts`:
```typescript
{
  id: 'new-provider',
  name: 'NewProvider',
  displayName: 'New Provider Name',
  statusPageUrl: 'https://status.newprovider.com',
  apiEndpoint: 'https://status.newprovider.com/api/v2/summary.json',
  color: '#ff6b6b',
}
```

### Customize Colors
Edit `app/globals.css`:
```css
:root {
  --myra-primary: #6366f1;
  --myra-secondary: #8b5cf6;
  --myra-accent: #a78bfa;
}
```

## 🚀 Deploying to Production

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Traditional Hosting
```bash
npm run build
npm start
# Runs on port 3000 by default
```

## 🎨 Features Highlights

1. **Liquid Design** - Modern glass morphism UI
2. **Real-Time Updates** - SSE-powered live status
3. **Zero Database** - In-memory caching (optional: add DB later)
4. **Mobile Responsive** - Works on all devices
5. **Professional Branding** - Custom myRA AI theme
6. **Notification System** - Slack, Discord, webhooks
7. **Embeddable Widget** - Drop into your main app
8. **Incident Timeline** - Detailed history for each provider

## 📱 Integrating with Your Main App

### Option 1: Iframe
```html
<iframe
  src="http://localhost:3002/status"
  width="100%"
  height="600px"
  frameborder="0"
></iframe>
```

### Option 2: Widget Component
Copy the widget component into your app and point it to the API:
```tsx
const [status, setStatus] = useState(null);

useEffect(() => {
  fetch('http://localhost:3002/api/status/current')
    .then(r => r.json())
    .then(setStatus);
}, []);
```

### Option 3: SSE Integration
```javascript
const eventSource = new EventSource('http://localhost:3002/api/status/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateYourUI(data);
};
```

## ⚠️ Known Issues

1. **Brave Status API** - Returns HTML instead of JSON. Might need custom scraping or check for updated API endpoint.
2. **Lockfile Warning** - Harmless warning about multiple package-lock.json files in parent directory.

## 💡 Next Steps

1. ✅ Dashboard is running - check it out!
2. Configure notifications for your team
3. Embed the widget in your main orchestrator
4. Customize colors/branding as needed
5. Deploy to production when ready

## 📚 Full Documentation

See `README.md` for complete documentation including:
- Detailed API reference
- Advanced customization
- Performance optimization
- Future enhancements

---

Built with ❤️ for myRA AI's Multi-Agent Research Orchestrator
