/**
 * Mention Notification Email Template
 *
 * Sent when a user is @mentioned in an activity note
 */

import { Text } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';
import NotificationCard from './components/NotificationCard';
import { MentionEmailData } from '@/lib/email/types';

interface MentionNotificationProps extends MentionEmailData {
  baseUrl: string;
}

export default function MentionNotification({
  toName,
  actorName,
  orgName,
  notePreview,
  actionUrl,
  notePriority,
  baseUrl,
}: MentionNotificationProps) {
  const preview = `${actorName} mentioned you in ${orgName}`;
  const fullUrl = `${baseUrl}${actionUrl}`;

  return (
    <Layout preview={preview}>
      <Header
        title={`You were mentioned in ${orgName}`}
        subtitle={`${actorName} mentioned you in a note`}
      />

      <Text
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
        }}
      >
        {toName ? `Hi ${toName}, ` : 'Hi, '}
        <strong>{actorName}</strong> mentioned you in a note:
      </Text>

      <NotificationCard variant="mention">
        <Text
          style={{
            fontSize: '14px',
            color: '#1F2937',
            lineHeight: '1.6',
            margin: '0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {notePreview}
        </Text>
      </NotificationCard>

      {notePriority >= 65 && (
        <Text
          style={{
            fontSize: '13px',
            color: '#DC2626',
            fontWeight: '600',
            margin: '0 0 20px 0',
          }}
        >
          Priority: High
        </Text>
      )}

      <div style={{ marginTop: '24px' }}>
        <Button href={fullUrl} variant="primary">
          View Note
        </Button>
      </div>

      <Footer baseUrl={baseUrl} />
    </Layout>
  );
}
