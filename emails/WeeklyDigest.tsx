/**
 * Weekly Digest Email Template
 *
 * Sent weekly with a summary of notifications and activity stats
 */

import { Text, Section } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';
import { WeeklyDigestEmailData, DigestNotification } from '@/lib/email/types';

interface WeeklyDigestProps extends WeeklyDigestEmailData {
  baseUrl: string;
}

// Component for rendering a single notification in the digest
function DigestNotificationItem({ notification }: { notification: DigestNotification }) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${getPriorityColor(notification.priority_score)}`,
        backgroundColor: getPriorityBgColor(notification.priority_score),
        padding: '12px',
        marginBottom: '12px',
        borderRadius: '4px',
      }}
    >
      <Text
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0',
        }}
      >
        {notification.title}
      </Text>
      <Text
        style={{
          fontSize: '13px',
          color: '#4B5563',
          margin: '0 0 8px 0',
          lineHeight: '1.4',
        }}
      >
        {notification.message}
      </Text>
      <Text
        style={{
          fontSize: '12px',
          color: '#6B7280',
          margin: '0',
        }}
      >
        {notification.entity_title} • {formatDate(notification.created_at)}
      </Text>
    </div>
  );
}

export default function WeeklyDigest({
  userName,
  notifications,
  totalCount,
  period,
  weekStart,
  weekEnd,
  stats,
  baseUrl,
}: WeeklyDigestProps) {
  const preview = `Your weekly digest - ${totalCount} notification${totalCount !== 1 ? 's' : ''}`;
  const hasHigh = notifications.high.length > 0;
  const hasMedium = notifications.medium.length > 0;
  const hasLow = notifications.low.length > 0;

  return (
    <Layout preview={preview}>
      <Header
        title="Your Weekly Digest"
        subtitle={`${weekStart} - ${weekEnd} • ${totalCount} notification${totalCount !== 1 ? 's' : ''}`}
      />

      <Text
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.6',
          margin: '0 0 24px 0',
        }}
      >
        Hi {userName}, here's your weekly summary:
      </Text>

      {/* Weekly Stats */}
      <Section
        style={{
          backgroundColor: '#F0F9FF',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #BAE6FD',
        }}
      >
        <Text
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#0C4A6E',
            margin: '0 0 16px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          This Week's Activity
        </Text>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div>
            <Text
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#0369A1',
                margin: '0 0 4px 0',
              }}
            >
              {stats.totalMentions}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#075985',
                margin: '0',
              }}
            >
              Mentions
            </Text>
          </div>
          <div>
            <Text
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#0369A1',
                margin: '0 0 4px 0',
              }}
            >
              {stats.totalHandoffs}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#075985',
                margin: '0',
              }}
            >
              Trial Handoffs
            </Text>
          </div>
          <div>
            <Text
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#0369A1',
                margin: '0 0 4px 0',
              }}
            >
              {stats.totalNotes}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#075985',
                margin: '0',
              }}
            >
              New Notes
            </Text>
          </div>
          <div>
            <Text
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0369A1',
                margin: '0 0 4px 0',
              }}
            >
              {stats.mostActiveOrg || 'N/A'}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#075985',
                margin: '0',
              }}
            >
              Most Active Trial
            </Text>
          </div>
        </div>
      </Section>

      {/* Priority Summary */}
      <Section
        style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '32px',
        }}
      >
        <Text
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Notification Breakdown
        </Text>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#EF4444',
                margin: '0 0 4px 0',
              }}
            >
              {notifications.high.length}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '0',
              }}
            >
              High Priority
            </Text>
          </div>
          <div style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#F59E0B',
                margin: '0 0 4px 0',
              }}
            >
              {notifications.medium.length}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '0',
              }}
            >
              Medium Priority
            </Text>
          </div>
          <div style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#10B981',
                margin: '0 0 4px 0',
              }}
            >
              {notifications.low.length}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '0',
              }}
            >
              Low Priority
            </Text>
          </div>
        </div>
      </Section>

      {/* High Priority Notifications - Show top 3 */}
      {hasHigh && (
        <Section style={{ marginBottom: '32px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#EF4444',
              margin: '0 0 16px 0',
            }}
          >
            High Priority ({notifications.high.length})
          </Text>
          {notifications.high.slice(0, 3).map((notification) => (
            <DigestNotificationItem key={notification.id} notification={notification} />
          ))}
          {notifications.high.length > 3 && (
            <Text
              style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: '8px 0 0 0',
                fontStyle: 'italic',
              }}
            >
              + {notifications.high.length - 3} more high priority notification{notifications.high.length - 3 !== 1 ? 's' : ''}
            </Text>
          )}
        </Section>
      )}

      {/* Medium Priority Notifications - Show count only */}
      {hasMedium && (
        <Section style={{ marginBottom: '32px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#F59E0B',
              margin: '0 0 8px 0',
            }}
          >
            Medium Priority ({notifications.medium.length})
          </Text>
          <Text
            style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: '0',
            }}
          >
            {notifications.medium.length} medium priority notification{notifications.medium.length !== 1 ? 's' : ''} this week.
          </Text>
        </Section>
      )}

      {/* Low Priority Notifications - Show count only */}
      {hasLow && (
        <Section style={{ marginBottom: '32px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#10B981',
              margin: '0 0 8px 0',
            }}
          >
            Low Priority ({notifications.low.length})
          </Text>
          <Text
            style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: '0',
            }}
          >
            {notifications.low.length} low priority notification{notifications.low.length !== 1 ? 's' : ''} this week.
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Button href={`${baseUrl}/notifications`} variant="primary">
          View All Notifications
        </Button>
      </div>

      <Footer baseUrl={baseUrl} />
    </Layout>
  );
}

// Helper functions
function getPriorityColor(score: number): string {
  if (score >= 65) return '#EF4444'; // Red for high
  if (score >= 50) return '#F59E0B'; // Orange for medium
  return '#10B981'; // Green for low
}

function getPriorityBgColor(score: number): string {
  if (score >= 65) return '#FEF2F2'; // Light red
  if (score >= 50) return '#FFFBEB'; // Light orange
  return '#ECFDF5'; // Light green
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
