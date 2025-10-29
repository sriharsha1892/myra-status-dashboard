# Service Mapping & Capabilities

This document explains which services the status dashboard monitors and what capabilities each service provides.

## Overview

The dashboard monitors **5 primary services** across **4 categories**:

1. **Large Language Models (LLM)** - AI models for text generation, reasoning, and analysis
2. **Search Services** - Web research and content discovery
3. **Infrastructure** - Cloud compute and hosting
4. **Multimodal AI** - Vision and text combined

---

## Service Catalog

### 1. Advanced Reasoning AI

**Category**: Large Language Model (LLM)
**Priority**: Primary
**Service ID**: `llm-advanced-reasoning`

#### What it does
High-capability AI model specialized in complex reasoning, coding, and deep analysis. This service powers sophisticated research tasks, code generation, and multi-step problem solving.

#### Capabilities
- Text generation
- Advanced reasoning
- Function calling
- Multimodal understanding

#### Components Monitored
- **Core API** (Critical)
  - Main API endpoint for advanced reasoning requests
  - Handles complex queries and extended thinking tasks

- **Streaming API** (Non-critical)
  - Real-time streaming responses
  - Progressive output for long-running tasks

#### When to use
- Complex coding tasks
- Multi-step reasoning problems
- Detailed analysis and research
- When you need the highest capability model

#### What we monitor
- API response times
- Error rates
- Streaming availability
- Overall service health

---

### 2. General Purpose AI

**Category**: Large Language Model (LLM)
**Priority**: Primary
**Service ID**: `llm-general-purpose`

#### What it does
Fast, versatile AI model for general text generation, conversations, and everyday tasks. Optimized for speed and general-purpose applications.

#### Capabilities
- Text generation
- Function calling
- Vision processing
- Conversational AI

#### Components Monitored
- **Core API** (Critical)
  - Primary text generation endpoint
  - Handles general completions and generations

- **Chat API** (Critical)
  - Interactive chat interface
  - Multi-turn conversations
  - Maintains context across messages

#### When to use
- Quick responses
- General text generation
- Conversational interfaces
- Image analysis (with vision)
- When speed is prioritized

#### What we monitor
- Chat API availability
- Completion API health
- Response latencies
- Function calling status

---

### 3. Web Research & Search

**Category**: Search Service
**Priority**: Primary
**Service ID**: `web-research-service`

#### What it does
AI-powered web search and content discovery service. Provides neural search capabilities for finding relevant information across the web.

#### Capabilities
- Web search
- Content discovery
- Neural search
- Semantic retrieval

#### Components Monitored
- **Search API** (Critical)
  - Neural search endpoint
  - Content retrieval system
  - Query processing

#### When to use
- Finding web content
- Research and fact-checking
- Content discovery
- Semantic search tasks

#### What we monitor
- Search API availability
- Query success rates
- Response quality
- Service uptime

---

### 4. Cloud Infrastructure

**Category**: Infrastructure
**Priority**: Secondary
**Service ID**: `cloud-infrastructure`

#### What it does
Backend compute and model hosting infrastructure. Provides the underlying cloud resources for running AI models and services.

#### Capabilities
- Code execution
- Compute resources
- Model hosting
- API gateway services

#### Components Monitored
- **Compute Instances** (Critical)
  - Virtual machine instances
  - GPU compute resources
  - Model serving infrastructure

- **API Gateway** (Critical)
  - Request routing
  - Load balancing
  - Rate limiting
  - Authentication

#### When to use
This is a backend service that supports other AI services. Users don't directly interact with it, but its health affects overall system performance.

#### What we monitor
- Compute instance availability
- API gateway health
- Network connectivity
- Regional availability

---

### 5. Multimodal AI

**Category**: Large Language Model (LLM)
**Priority**: Primary
**Service ID**: `llm-multimodal`

#### What it does
AI model with combined vision, text, and reasoning capabilities. Excels at tasks requiring both visual and textual understanding.

#### Capabilities
- Text generation
- Vision processing
- Reasoning
- Multimodal analysis

#### Components Monitored
- **Core API** (Critical)
  - Unified multimodal endpoint
  - Text and vision combined
  - Integrated reasoning

- **Vision Processing** (Non-critical)
  - Image analysis subsystem
  - Visual understanding
  - Object detection

#### When to use
- Image analysis combined with reasoning
- Document understanding (text + images)
- Visual question answering
- Multimodal research tasks

#### What we monitor
- Multimodal API health
- Vision processing status
- Integration between text and vision
- Overall service availability

---

## Service Capabilities Explained

### Text Generation
Creating human-like text based on prompts. Used for:
- Writing assistance
- Content generation
- Summaries and explanations
- Code comments and documentation

### Reasoning
Multi-step logical thinking and problem-solving. Used for:
- Complex problem solving
- Chain-of-thought analysis
- Mathematical reasoning
- Logical deduction

### Vision
Processing and understanding images. Used for:
- Image analysis
- Visual question answering
- Document OCR
- Object detection

### Web Search
Finding and retrieving web content. Used for:
- Research and fact-checking
- Content discovery
- Real-time information
- Source finding

### Function Calling
Ability to call external functions/APIs. Used for:
- Tool integration
- API interactions
- Structured data extraction
- Action execution

### Multimodal
Combined understanding of text, images, and other media. Used for:
- Document analysis (text + images)
- Visual reasoning
- Complex content understanding

---

## Service Priority Levels

### Primary Services
Services critical to core functionality. Outages significantly impact operations.

**Primary Services**:
- Advanced Reasoning AI
- General Purpose AI
- Web Research & Search
- Multimodal AI

### Secondary Services
Supporting services that enhance functionality but aren't critical.

**Secondary Services**:
- Cloud Infrastructure

### Optional Services
Nice-to-have services that provide additional capabilities.

---

## Component Criticality

### Critical Components
If a critical component fails, the entire service is considered degraded or offline.

### Non-Critical Components
If a non-critical component fails, the service continues operating with reduced functionality.

---

## Status Levels

The dashboard shows these status levels for each service:

### Operational
✅ All systems functioning normally

### Degraded Performance
⚠️ Service available but running slower than normal

### Partial Outage
🟠 Some features unavailable, core functionality may work

### Major Outage
🔴 Service completely unavailable

### Under Maintenance
🔧 Scheduled maintenance in progress

---

## How Services Work Together

```
User Request
    │
    ├─→ General Purpose AI (quick responses)
    ├─→ Advanced Reasoning AI (complex tasks)
    ├─→ Web Research & Search (find information)
    │       │
    │       └─→ return web content
    │
    ├─→ Multimodal AI (vision + text tasks)
    │
    └─→ All services run on Cloud Infrastructure
```

---

## Monitoring Strategy

For each service, we monitor:

1. **Availability**: Is the service reachable?
2. **Performance**: Are response times acceptable?
3. **Error Rates**: Are requests failing?
4. **Component Health**: Are all components operational?
5. **Incident History**: Recent issues and resolutions

---

## Service Health Indicators

### Color Coding
- 🟢 **Green**: Operational
- 🟡 **Yellow**: Degraded
- 🟠 **Orange**: Partial Outage
- 🔴 **Red**: Major Outage
- 🔵 **Blue**: Maintenance

### Uptime Tracking
We track uptime percentage over:
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days

---

## What This Dashboard Does NOT Monitor

To set clear expectations, this dashboard does **not** monitor:

- Individual user account status
- API quota or usage limits
- Billing or payment systems
- Specific model versions (e.g., GPT-4 vs GPT-3.5)
- Internal application code
- Custom integrations or middleware

We only monitor the **upstream service availability** as reported by the service providers themselves.

---

## Adding New Services

When adding a new service, we consider:

1. **Capability**: What unique capability does it provide?
2. **Category**: Which category does it belong to?
3. **Priority**: How critical is it to operations?
4. **Components**: What specific APIs/endpoints should we monitor?
5. **User Impact**: How does its status affect users?

---

## FAQ

### Q: Why these specific services?

These services represent the core capabilities needed for AI-powered research and analysis workflows.

### Q: Can I request monitoring for additional services?

Yes! If there's a service you depend on that's not monitored, please open an issue describing:
- What the service does
- Why it's important
- What capabilities it provides

### Q: Why are some components marked as "non-critical"?

Non-critical components provide enhanced functionality but aren't required for core operations. For example, streaming APIs are nice-to-have but not essential if the standard API works.

### Q: How often is status updated?

Status is checked every 60 seconds for all services.

### Q: What happens if multiple services are down?

The dashboard shows the overall system status based on the worst-case scenario of all monitored services.

---

## For Developers

If you're integrating with this dashboard:

### Service-Based Queries

Query by service ID:
```javascript
const service = await fetch('/api/status/current?serviceId=llm-advanced-reasoning');
```

Query by capability:
```javascript
const services = await fetch('/api/status/current?capability=text-generation');
```

Query by category:
```javascript
const llmServices = await fetch('/api/status/current?category=llm');
```

### Response Format

```json
{
  "serviceId": "llm-advanced-reasoning",
  "displayName": "Advanced Reasoning AI",
  "status": "operational",
  "components": [
    {
      "componentId": "llm-adv-api",
      "displayName": "Core API",
      "status": "operational",
      "critical": true
    }
  ],
  "capabilities": ["text-generation", "reasoning"],
  "uptimePercentage": 99.95
}
```

---

## Related Documentation

- [Zero-Knowledge Provider System](./ZERO_KNOWLEDGE_PROVIDER_SYSTEM.md) - Architecture details
- [Environment Configuration](./../.env.example.v2) - Setup guide
