import { ProviderStatus, ServiceStatus } from './types';

export interface NotificationConfig {
  webhookUrl?: string;
  email?: string;
  slackWebhook?: string;
  discordWebhook?: string;
}

export interface StatusChangeEvent {
  provider: string;
  oldStatus: ServiceStatus;
  newStatus: ServiceStatus;
  timestamp: string;
  message: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private previousStatuses: Map<string, ServiceStatus> = new Map();
  private config: NotificationConfig = {};

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public configure(config: NotificationConfig): void {
    this.config = config;
  }

  public async checkAndNotify(providers: ProviderStatus[]): Promise<void> {
    const changes: StatusChangeEvent[] = [];

    for (const provider of providers) {
      const previousStatus = this.previousStatuses.get(provider.provider.id);

      if (previousStatus && previousStatus !== provider.status) {
        changes.push({
          provider: provider.provider.displayName,
          oldStatus: previousStatus,
          newStatus: provider.status,
          timestamp: new Date().toISOString(),
          message: this.generateMessage(provider.provider.displayName, previousStatus, provider.status),
        });
      }

      this.previousStatuses.set(provider.provider.id, provider.status);
    }

    if (changes.length > 0) {
      await this.sendNotifications(changes);
    }
  }

  private generateMessage(provider: string, oldStatus: ServiceStatus, newStatus: ServiceStatus): string {
    const statusText = {
      operational: 'operational',
      degraded_performance: 'experiencing degraded performance',
      partial_outage: 'experiencing a partial outage',
      major_outage: 'experiencing a major outage',
      under_maintenance: 'under maintenance',
      unknown: 'in an unknown state',
    };

    if (newStatus === 'operational' && oldStatus !== 'operational') {
      return `✅ ${provider} has recovered and is now ${statusText[newStatus]}.`;
    } else {
      return `⚠️ ${provider} status changed from ${statusText[oldStatus]} to ${statusText[newStatus]}.`;
    }
  }

  private async sendNotifications(changes: StatusChangeEvent[]): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.slackWebhook) {
      promises.push(this.sendSlackNotification(changes));
    }

    if (this.config.discordWebhook) {
      promises.push(this.sendDiscordNotification(changes));
    }

    if (this.config.webhookUrl) {
      promises.push(this.sendWebhookNotification(changes));
    }

    await Promise.allSettled(promises);
  }

  private async sendSlackNotification(changes: StatusChangeEvent[]): Promise<void> {
    if (!this.config.slackWebhook) return;

    const blocks = changes.map(change => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: change.message,
      },
    }));

    try {
      await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'myRA AI Status Update',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🔔 myRA AI Status Update',
              },
            },
            ...blocks,
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  private async sendDiscordNotification(changes: StatusChangeEvent[]): Promise<void> {
    if (!this.config.discordWebhook) return;

    const embeds = changes.map(change => ({
      title: `${change.provider} Status Change`,
      description: change.message,
      color: change.newStatus === 'operational' ? 0x10b981 : 0xef4444,
      timestamp: change.timestamp,
      footer: {
        text: 'myRA AI Status Monitor',
      },
    }));

    try {
      await fetch(this.config.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'myRA AI Status',
          embeds,
        }),
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
    }
  }

  private async sendWebhookNotification(changes: StatusChangeEvent[]): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_change',
          changes,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
}
