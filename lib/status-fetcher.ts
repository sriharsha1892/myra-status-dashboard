import { Provider, ProviderStatus, ServiceStatus, Component, Incident } from './types';

export class StatusFetcher {
  private static async fetchWithTimeout(url: string, timeout = 10000): Promise<any> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'myRA-AI-Status-Dashboard/1.0',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  private static mapStatusIndicator(indicator: string): ServiceStatus {
    const normalized = indicator.toLowerCase().replace(/\s+/g, '_');

    const mapping: Record<string, ServiceStatus> = {
      // Statuspage.io indicator values
      'none': 'operational',
      'minor': 'degraded_performance',
      'major': 'partial_outage',
      'critical': 'major_outage',
      'maintenance': 'under_maintenance',

      // Direct status values (already in correct format)
      'operational': 'operational',
      'degraded_performance': 'degraded_performance',
      'partial_outage': 'partial_outage',
      'major_outage': 'major_outage',
      'under_maintenance': 'under_maintenance',

      // Alternative formats
      'degraded': 'degraded_performance',
      'outage': 'partial_outage',
      'down': 'major_outage',
    };

    return mapping[normalized] || 'operational';
  }

  private static async fetchStatusPageIO(provider: Provider): Promise<ProviderStatus> {
    try {
      // Fetch both summary and incidents
      const summaryUrl = provider.apiEndpoint;
      const incidentsUrl = provider.apiEndpoint.replace('/summary.json', '/incidents.json');

      const [summaryData, incidentsData] = await Promise.all([
        this.fetchWithTimeout(summaryUrl),
        this.fetchWithTimeout(incidentsUrl).catch(() => ({ incidents: [] }))
      ]);

      const components: Component[] = (summaryData.components || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: this.mapStatusIndicator(c.status),
        description: c.description,
      }));

      // Get incidents from both sources (summary might have some, incidents.json has more recent ones)
      const allIncidents = [
        ...(summaryData.incidents || []),
        ...(incidentsData.incidents || [])
      ];

      // Deduplicate by id
      const uniqueIncidents = Array.from(
        new Map(allIncidents.map(i => [i.id, i])).values()
      );

      const incidents: Incident[] = uniqueIncidents.map((i: any) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        impact: i.impact,
        created_at: i.created_at,
        updated_at: i.updated_at,
        shortlink: i.shortlink,
        incident_updates: i.incident_updates || [],
      }));

      return {
        provider,
        status: this.mapStatusIndicator(summaryData.status?.indicator || 'none'),
        indicator: summaryData.status?.indicator || 'none',
        lastUpdated: new Date().toISOString(),
        components,
        incidents,
        scheduledMaintenances: summaryData.scheduled_maintenances || [],
      };
    } catch (error) {
      console.error(`Error fetching status for ${provider.name}:`, error);
      return {
        provider,
        status: 'unknown',
        indicator: 'unknown',
        lastUpdated: new Date().toISOString(),
        components: [],
        incidents: [],
      };
    }
  }

  private static async fetchGoogleStatus(provider: Provider): Promise<ProviderStatus> {
    try {
      const data = await this.fetchWithTimeout(provider.apiEndpoint);

      // Google's incident format is different
      const recentIncidents = (data || [])
        .filter((i: any) => i.service_name?.includes('Gemini') || i.service_name?.includes('AI'))
        .slice(0, 10)
        .map((i: any) => ({
          id: i.id,
          name: i.external_desc || i.service_name,
          status: i.currently_affected ? 'investigating' : 'resolved',
          impact: i.severity || 'medium',
          created_at: i.begin,
          updated_at: i.modified || i.end || i.begin,
          shortlink: `https://status.cloud.google.com/incidents/${i.id}`,
          incident_updates: [],
        }));

      const hasActiveIncidents = recentIncidents.some((i: Incident) =>
        i.status !== 'resolved' && i.status !== 'postmortem'
      );

      return {
        provider,
        status: hasActiveIncidents ? 'partial_outage' : 'operational',
        indicator: hasActiveIncidents ? 'minor' : 'none',
        lastUpdated: new Date().toISOString(),
        components: [{
          id: 'gemini-api',
          name: 'Gemini API',
          status: hasActiveIncidents ? 'partial_outage' : 'operational',
        }],
        incidents: recentIncidents,
      };
    } catch (error) {
      console.error(`Error fetching Google status:`, error);
      return {
        provider,
        status: 'unknown',
        indicator: 'unknown',
        lastUpdated: new Date().toISOString(),
        components: [],
        incidents: [],
      };
    }
  }

  private static async fetchAWSStatus(provider: Provider): Promise<ProviderStatus> {
    try {
      // AWS Health Dashboard uses RSS feeds per region
      // We'll check ap-southeast-1 (Singapore) and ap-south-1 (Mumbai)
      const regions = [
        { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
        { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)' }
      ];

      // Fetch RSS feeds for both regions
      const rssPromises = regions.map(async (region) => {
        try {
          const rssUrl = `https://status.aws.amazon.com/rss/${region.id}.rss`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(rssUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'myRA-AI-Status-Dashboard/1.0',
            },
          });
          clearTimeout(id);

          if (!response.ok) {
            return { region, hasIssues: false, incidents: [] };
          }

          const rssText = await response.text();

          // Parse RSS for recent items (last 30 days)
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          const itemMatches = Array.from(rssText.matchAll(/<item>([\s\S]*?)<\/item>/g));

          const incidents = itemMatches
            .map((match, index) => {
              const itemContent = match[1];
              const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
              const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
              const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
              const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);

              if (!titleMatch || !dateMatch) return null;

              const pubDate = new Date(dateMatch[1]);
              if (pubDate.getTime() < thirtyDaysAgo) return null;

              return {
                id: `aws-${region.id}-${index}`,
                name: titleMatch[1],
                status: titleMatch[1].toLowerCase().includes('resolved') ? 'resolved' : 'investigating',
                impact: titleMatch[1].toLowerCase().includes('increased') ? 'minor' : 'medium',
                created_at: pubDate.toISOString(),
                updated_at: pubDate.toISOString(),
                shortlink: linkMatch ? linkMatch[1] : '',
                incident_updates: descMatch ? [{ body: descMatch[1] }] : [],
              };
            })
            .filter((i): i is Incident => i !== null);

          return { region, hasIssues: incidents.length > 0, incidents };
        } catch (error) {
          console.error(`Error fetching AWS RSS for ${region.name}:`, error);
          return { region, hasIssues: false, incidents: [] };
        }
      });

      const regionResults = await Promise.all(rssPromises);
      const allIncidents = regionResults.flatMap(r => r.incidents);
      const hasActiveIssues = regionResults.some(r => r.hasIssues);

      // Create components for each region
      const components: Component[] = regions.map((region) => {
        const regionResult = regionResults.find(r => r.region.id === region.id);
        return {
          id: `aws-${region.id}`,
          name: region.name,
          status: regionResult?.hasIssues ? 'partial_outage' : 'operational',
        };
      });

      return {
        provider,
        status: hasActiveIssues ? 'partial_outage' : 'operational',
        indicator: hasActiveIssues ? 'minor' : 'none',
        lastUpdated: new Date().toISOString(),
        components,
        incidents: allIncidents,
      };
    } catch (error) {
      console.error('Error fetching AWS status:', error);
      return {
        provider,
        status: 'unknown',
        indicator: 'unknown',
        lastUpdated: new Date().toISOString(),
        components: [],
        incidents: [],
      };
    }
  }

  private static async fetchBetterStackStatus(provider: Provider): Promise<ProviderStatus> {
    try {
      // Fetch the HTML page
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(provider.statusPageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'myRA-AI-Status-Dashboard/1.0',
        },
      });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Parse overall status from the icon class
      const overallMatch = html.match(/status-page__overview-icon--(\w+)/);
      const overallStatus = overallMatch ? overallMatch[1] : 'unknown';

      // Extract service list - match service names
      const serviceMatches = Array.from(html.matchAll(/status-page__resource-name[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?([^<\n]+)</g));

      const components: Component[] = serviceMatches
        .map((match, index) => {
          const name = match[1].trim();
          if (!name) return null;

          // Look for operational indicators in the HTML around this service
          const serviceSection = html.substring(match.index || 0, (match.index || 0) + 500);
          const hasOperationalIcon = serviceSection.includes('not_monitored_small') ? 'operational' : 'operational';

          return {
            id: `brave-${index}`,
            name: name,
            status: 'operational' as ServiceStatus, // BetterStack shows all as operational if page loads
          };
        })
        .filter((c): c is Component => c !== null)
        .filter(c => c.name.toLowerCase().includes('search') || c.name.toLowerCase().includes('api'));

      return {
        provider,
        status: this.mapStatusIndicator(overallStatus),
        indicator: overallStatus,
        lastUpdated: new Date().toISOString(),
        components: components.length > 0 ? components : [{
          id: 'brave-search',
          name: 'Brave Search',
          status: this.mapStatusIndicator(overallStatus),
        }],
        incidents: [],
      };
    } catch (error) {
      console.error(`Error fetching Brave status:`, error);
      return {
        provider,
        status: 'unknown',
        indicator: 'unknown',
        lastUpdated: new Date().toISOString(),
        components: [],
        incidents: [],
      };
    }
  }

  public static async fetchProviderStatus(provider: Provider): Promise<ProviderStatus> {
    if (provider.id === 'google') {
      return this.fetchGoogleStatus(provider);
    }
    if (provider.id === 'brave') {
      return this.fetchBetterStackStatus(provider);
    }
    if (provider.id === 'aws') {
      return this.fetchAWSStatus(provider);
    }
    return this.fetchStatusPageIO(provider);
  }

  public static async fetchAllStatuses(providers: Provider[]): Promise<ProviderStatus[]> {
    const promises = providers.map(provider => this.fetchProviderStatus(provider));
    return Promise.all(promises);
  }
}
