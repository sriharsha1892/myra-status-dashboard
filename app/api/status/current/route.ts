import { NextResponse } from 'next/server';
import { StatusCache } from '@/lib/status-cache';
import { StatusResponse } from '@/lib/types';
import { obfuscateProviderId } from '@/lib/id-obfuscation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Generic component name mapping to protect provider identity
function sanitizeComponentName(originalName: string, providerId: string): string {
  const name = originalName.toLowerCase();

  // Remove all vendor-identifying keywords
  const vendorKeywords = [
    'openai', 'anthropic', 'claude', 'exa', 'gemini', 'vertex', 'gpt', 'chatgpt',
    'google', 'brave', 'aws', 'amazon', 'bedrock'
  ];

  let sanitized = originalName;

  // Strip vendor names case-insensitively
  vendorKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '').trim();
  });

  // Remove URLs and domains (anything with .com, .ai, .io, etc.)
  sanitized = sanitized.replace(/[a-z0-9\-]+\.(com|ai|io|net|org|app|dev)/gi, 'platform');

  // Remove parenthetical explanations
  sanitized = sanitized.replace(/\([^)]*\)/g, '');

  // Clean up multiple spaces, dots, and leading/trailing punctuation
  sanitized = sanitized.replace(/\.{2,}/g, '').replace(/\s+/g, ' ').replace(/^[\s\-\.]+|[\s\-\.]+$/g, '');

  // If only "platform" or "code" remains, map to generic service
  if (sanitized.toLowerCase() === 'platform' || sanitized.toLowerCase() === 'code') {
    return 'Platform Service';
  }

  // Map to generic categories based on function
  if (name.includes('chat') || name.includes('completion') || name.includes('conversation')) {
    return 'Conversational Interface';
  }
  if (name.includes('search') || name.includes('web') || name.includes('crawl')) {
    return 'Web Search Service';
  }
  if (name.includes('api') && (name.includes('2.0') || name.includes('flash') || name.includes('pro'))) {
    return 'Extended Processing API';
  }
  if (name.includes('api')) {
    return 'Core API Service';
  }
  if (name.includes('realtime') || name.includes('streaming')) {
    return 'Real-time Processing';
  }
  if (name.includes('voice') || name.includes('audio') || name.includes('speech')) {
    return 'Voice Processing';
  }
  if (name.includes('image') || name.includes('vision') || name.includes('video')) {
    return 'Visual Processing';
  }
  if (name.includes('file') || name.includes('upload') || name.includes('storage')) {
    return 'File Operations';
  }
  if (name.includes('embed') || name.includes('vector')) {
    return 'Data Embedding';
  }
  if (name.includes('fine-tun') || name.includes('train')) {
    return 'Model Training';
  }
  if (name.includes('batch') || name.includes('async')) {
    return 'Batch Processing';
  }
  if (name.includes('login') || name.includes('auth')) {
    return 'Authentication';
  }
  if (name.includes('feed') || name.includes('response')) {
    return 'Response Service';
  }
  if (name.includes('agent') || name.includes('assistant')) {
    return 'Agent Runtime';
  }
  if (name.includes('compliance') || name.includes('audit')) {
    return 'Compliance Service';
  }
  if (name.includes('research') || name.includes('deep')) {
    return 'Research Processing';
  }

  // If we have a sanitized name that's meaningful, return it
  if (sanitized && sanitized.length > 2 && !vendorKeywords.some(kw => sanitized.toLowerCase().includes(kw))) {
    return sanitized;
  }

  // Default fallback
  return 'Service Component';
}

// Generic incident name mapping to protect provider identity
function sanitizeIncidentName(originalName: string, providerId: string): string {
  const name = originalName.toLowerCase();

  // Map specific incidents to generic descriptions
  if (name.includes('error') || name.includes('elevated') || name.includes('increased')) {
    return 'Service experiencing elevated errors';
  }
  if (name.includes('slow') || name.includes('latency') || name.includes('timeout')) {
    return 'Performance degradation detected';
  }
  if (name.includes('down') || name.includes('outage') || name.includes('unavailable')) {
    return 'Temporary service disruption';
  }
  if (name.includes('maintenance') || name.includes('scheduled')) {
    return 'Scheduled maintenance completed';
  }
  if (name.includes('resolved') || name.includes('fixed')) {
    return 'Service issue resolved';
  }

  // Default generic message
  return 'Service status update';
}

// Get impact description based on provider role
function getImpactDescription(providerId: string, status: string): string {
  const impactMap: Record<string, Record<string, string>> = {
    'openai': {
      'degraded_performance': 'Research planning may be slower',
      'partial_outage': 'Some research coordination unavailable',
      'major_outage': 'Research coordination temporarily offline',
      'operational': 'Research planning and coordination'
    },
    'anthropic': {
      'degraded_performance': 'Quality checks may be delayed',
      'partial_outage': 'Some validation features unavailable',
      'major_outage': 'Quality validation temporarily offline',
      'operational': 'Analysis and validation services'
    },
    'exa': {
      'degraded_performance': 'Web search may be slower',
      'partial_outage': 'Some web research unavailable',
      'major_outage': 'Web research temporarily offline',
      'operational': 'Web search and data collection'
    },
    'aws': {
      'degraded_performance': 'Platform experiencing minor delays',
      'partial_outage': 'Some platform features unavailable',
      'major_outage': 'Platform services temporarily offline',
      'operational': 'Core system services'
    },
    'google': {
      'degraded_performance': 'Extended processing may be slower',
      'partial_outage': 'Some extended capabilities unavailable',
      'major_outage': 'Extended processing temporarily offline',
      'operational': 'Extended research capabilities'
    },
    'brave': {
      'degraded_performance': 'Supplemental search may be slower',
      'partial_outage': 'Some supplemental sources unavailable',
      'major_outage': 'Supplemental search temporarily offline',
      'operational': 'Additional web sources'
    }
  };

  return impactMap[providerId]?.[status] || 'Service status';
}

export async function GET() {
  try {
    const cache = StatusCache.getInstance();
    const providers = await cache.getStatuses();
    const overallStatus = cache.getOverallStatus();

    // Sanitize provider data - strip sensitive information
    const sanitizedProviders = providers.map(p => {
      // Sanitize incidents - rewrite with generic descriptions
      const sanitizedIncidents = (p.incidents || []).map(incident => ({
        id: incident.id,
        name: sanitizeIncidentName(incident.name, p.provider.id),
        status: incident.status,
        impact: incident.impact,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
        // Remove shortlink - no external links
        incident_updates: incident.incident_updates?.map(update => ({
          body: 'Service status update',
          status: update.status,
          created_at: update.created_at
        })) || []
      }));

      // Sanitize component names - remove vendor identifiers
      const sanitizedComponents = (p.components || []).map(component => ({
        id: component.id,
        name: sanitizeComponentName(component.name, p.provider.id),
        status: component.status,
        // Remove description if it contains vendor info
      }));

      return {
        provider: {
          // Only expose safe fields with obfuscated ID
          id: obfuscateProviderId(p.provider.id), // Obfuscated for client exposure (e.g., "srv-a3f2")
          displayName: p.provider.displayName, // Safe obfuscated name
          color: p.provider.color,
          priority: p.provider.priority,
          // REMOVED: name, statusPageUrl, apiEndpoint (all reveal vendor)
        },
        status: p.status,
        indicator: p.indicator,
        lastUpdated: p.lastUpdated,
        components: sanitizedComponents,
        incidents: sanitizedIncidents,
        scheduledMaintenances: [], // Remove maintenance info
        history: cache.getHistory(p.provider.id),
        uptimePercentage: cache.getUptimePercentage(p.provider.id),
        impactDescription: getImpactDescription(p.provider.id, p.status)
      };
    });

    const response = {
      providers: sanitizedProviders,
      lastUpdated: new Date().toISOString(),
      overallStatus,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in status API:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve system status. Please try again later.' },
      { status: 500 }
    );
  }
}
