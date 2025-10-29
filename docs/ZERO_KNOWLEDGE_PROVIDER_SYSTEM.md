# Zero-Knowledge Provider System

## Overview

The Zero-Knowledge Provider System is an architecture that allows monitoring third-party service status without exposing vendor identities in the codebase, client-side code, API responses, or logs.

## Key Principles

1. **Service-Capability Based**: Services are defined by what they do, not who provides them
2. **Server-Only Vendor Info**: Actual vendor names only exist in environment variables
3. **Automatic Sanitization**: All outputs are automatically scrubbed of vendor references
4. **Type-Safe Abstraction**: TypeScript interfaces ensure no vendor coupling
5. **User-Friendly Naming**: Clear, meaningful service names based on capabilities

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Side                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services shown as:                                     │ │
│  │  - "Advanced Reasoning AI"                              │ │
│  │  - "General Purpose AI"                                 │ │
│  │  - "Web Research & Search"                              │ │
│  │  - "Cloud Infrastructure"                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Sanitized API Response
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Sanitization Layer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Runtime Sanitizer                                      │ │
│  │  - Scrubs all vendor names                              │ │
│  │  - Sanitizes URLs and endpoints                         │ │
│  │  - Cleans error messages                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Server Side                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Catalog (lib/core/service-capabilities.ts)    │ │
│  │  - Defines services by capabilities                     │ │
│  │  - No vendor references                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ▲                                 │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Provider Registry (lib/server/provider-registry.*)    │ │
│  │  - Loads mappings from environment variables            │ │
│  │  - NEVER exposed to client                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ▲                                 │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Environment Variables (.env.local)                     │ │
│  │  - Actual vendor status URLs                            │ │
│  │  - Component ID mappings                                │ │
│  │  - NOT in version control                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Service Catalog (`lib/core/service-capabilities.ts`)

Defines all services based on capabilities:

```typescript
{
  serviceId: 'llm-advanced-reasoning',
  displayName: 'Advanced Reasoning AI',
  description: 'High-capability AI model for complex reasoning',
  category: 'llm',
  capabilities: ['text-generation', 'reasoning', 'function-calling'],
  components: [
    {
      componentId: 'llm-adv-api',
      displayName: 'Core API',
      critical: true,
    }
  ]
}
```

**No vendor names appear here.**

### 2. Provider Registry (`lib/server/provider-registry.server.ts`)

Server-only module that:
- Loads vendor mappings from environment variables
- Fetches status from actual vendor APIs
- Transforms vendor-specific formats to our standard format
- Maps vendor component IDs to our component IDs

**This file is NEVER imported by client code.**

### 3. Sanitization Middleware (`lib/middleware/sanitizer.ts`)

Automatically scrubs vendor references from:
- API responses
- Error messages
- Console logs
- Stack traces

```typescript
// Before sanitization
"OpenAI API experiencing elevated errors"

// After sanitization
"AI Provider API experiencing elevated errors"
```

### 4. Status API (`app/api/status/current/route.v2.ts`)

New service-based API that:
- Fetches status using the provider registry
- Returns service-based responses (not provider-based)
- Automatically sanitizes all outputs

## Setup

### 1. Configure Environment Variables

Copy `.env.example.v2` to `.env.local`:

```bash
cp .env.example.v2 .env.local
```

### 2. Configure Provider Mappings

For each service, configure the provider:

```bash
# Service: Advanced Reasoning AI
PROVIDER_1_SERVICE_ID=llm-advanced-reasoning
PROVIDER_1_STATUS_URL=https://status.anthropic.com
PROVIDER_1_API_ENDPOINT=https://status.anthropic.com/api/v2/summary.json
PROVIDER_1_FETCH_STRATEGY=atlassian
PROVIDER_1_COMPONENT_MAP={"bh014xh9wv0k":"llm-adv-api"}
```

### 3. Find Vendor Component IDs

To create component mappings:

1. Visit the vendor's API endpoint:
```bash
curl https://status.anthropic.com/api/v2/summary.json | jq '.components'
```

2. Find the component IDs:
```json
{
  "id": "bh014xh9wv0k",
  "name": "API",
  "status": "operational"
}
```

3. Map to your service component:
```json
{
  "bh014xh9wv0k": "llm-adv-api"
}
```

## Adding a New Service

### Step 1: Define the Service

Edit `lib/core/service-capabilities.ts`:

```typescript
{
  serviceId: 'new-service',
  displayName: 'New Service Name',
  description: 'What this service does',
  category: 'llm', // or 'search', 'infrastructure', 'embedding'
  capabilities: ['text-generation'],
  priority: 'primary',
  color: '#3b82f6',
  components: [
    {
      componentId: 'new-service-api',
      displayName: 'Core API',
      description: 'Main API endpoint',
      critical: true,
    }
  ]
}
```

### Step 2: Configure the Provider

Add to `.env.local`:

```bash
PROVIDER_6_SERVICE_ID=new-service
PROVIDER_6_STATUS_URL=https://status.vendor.com
PROVIDER_6_API_ENDPOINT=https://status.vendor.com/api/v2/summary.json
PROVIDER_6_FETCH_STRATEGY=atlassian
PROVIDER_6_COMPONENT_MAP={"vendor-comp-id":"new-service-api"}
```

### Step 3: Add Sanitization Rules (Optional)

If the vendor name isn't already covered, add to `lib/middleware/sanitizer.ts`:

```typescript
const VENDOR_PATTERNS = [
  // ... existing patterns
  { pattern: /newvendor/gi, replacement: 'AI Provider' },
];
```

## Security Features

### 1. Server-Only Provider Registry

The provider registry uses TypeScript's server-only convention:

```typescript
// lib/server/provider-registry.server.ts
// This file is NEVER bundled with client code
```

### 2. Runtime Sanitization

All API responses are automatically sanitized:

```typescript
import { sanitizeApiResponse } from '@/lib/middleware/sanitizer';

const response = sanitizeApiResponse({
  service: 'OpenAI Chat API', // Becomes: 'AI Provider Chat API'
});
```

### 3. Console Sanitization

Set up in your app entry point:

```typescript
import { setupConsoleSanitization } from '@/lib/middleware/sanitizer';

setupConsoleSanitization();
```

### 4. Type Safety

TypeScript ensures no vendor coupling:

```typescript
// ✅ Good - uses service capabilities
import { SERVICE_CATALOG } from '@/lib/core/service-capabilities';

// ❌ Bad - would fail compilation
import { getProviderConfigs } from '@/lib/server/provider-registry.server';
// Error: Module '"@/lib/server/provider-registry.server"' has no exported member 'getProviderConfigs'
```

## Migration from Old System

### Before
```typescript
// providers.ts
const providers = [
  {
    id: 'openai',
    name: 'OpenAI',
    statusPageUrl: 'https://status.openai.com'
  }
];
```

### After
```typescript
// service-capabilities.ts
const services = [
  {
    serviceId: 'llm-general-purpose',
    displayName: 'General Purpose AI',
    capabilities: ['text-generation']
  }
];

// .env.local
PROVIDER_1_SERVICE_ID=llm-general-purpose
PROVIDER_1_STATUS_URL=https://status.openai.com
```

## Benefits

1. **Zero Vendor Exposure**: No vendor names in codebase, client code, or API responses
2. **User-Friendly**: Services described by what they do, not who provides them
3. **Maintainable**: Easy to swap providers without code changes
4. **Type-Safe**: TypeScript prevents accidental vendor coupling
5. **Secure**: Server-only provider information
6. **Automatic**: Sanitization happens automatically

## Testing

Test the sanitization:

```typescript
import { sanitizeString, containsVendorReferences } from '@/lib/middleware/sanitizer';

// Test sanitization
const input = "OpenAI API is experiencing issues";
const output = sanitizeString(input);
// Output: "AI Provider API is experiencing issues"

// Check for leaks
const hasVendorRefs = containsVendorReferences("Some text");
// Returns: true if vendor references found
```

## FAQ

### Q: What if I need to add a new vendor?

Just add environment variables. No code changes needed if using an existing fetch strategy.

### Q: Can client code access vendor information?

No. The provider registry is server-only and never sent to the client.

### Q: What if sanitization fails?

The system degrades gracefully. If sanitization fails, it returns the original data rather than crashing.

### Q: How do I debug provider issues?

Enable development logging:

```bash
DEV_LOG_PROVIDER_ERRORS=true
DEV_SHOW_SANITIZATION_WARNINGS=true
```

### Q: Can I use this with custom status page formats?

Yes. Add a new fetch strategy in `provider-registry.server.ts`:

```typescript
case 'custom':
  return transformCustomResponse(config, data);
```

## Best Practices

1. **Never hardcode vendor names** - Use environment variables
2. **Always sanitize outputs** - Use the provided middleware
3. **Use service IDs, not vendor IDs** - Reference services by capability
4. **Keep .env.local secure** - Never commit to version control
5. **Document capabilities** - Make service descriptions clear
6. **Test sanitization** - Verify no vendor names leak

## Troubleshooting

### Issue: Provider not appearing in API

Check:
1. Environment variables are set correctly
2. `PROVIDER_N_SERVICE_ID` matches a service in the catalog
3. Component mappings are valid JSON
4. Fetch strategy is correct

### Issue: Vendor names still appearing

Check:
1. Sanitization middleware is applied to API routes
2. Console sanitization is set up
3. All vendor patterns are in the sanitizer
4. `.env.local` doesn't contain comments with vendor names

### Issue: Status not updating

Check:
1. API endpoint is accessible
2. Fetch strategy matches vendor format
3. Component mappings are correct
4. Check server logs for errors (with `DEV_LOG_PROVIDER_ERRORS=true`)
