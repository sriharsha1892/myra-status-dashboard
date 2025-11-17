/**
 * Account Manager Note Email Template
 *
 * Sent when a new note is added to a trial the user manages
 */

import { Text } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';
import NotificationCard from './components/NotificationCard';
import { AccountManagerNoteEmailData } from '@/lib/email/types';

interface AccountManagerNoteProps extends AccountManagerNoteEmailData {
  baseUrl: string;
}

// Map note categories to display names
const categoryDisplayNames: Record<string, string> = {
  feature_request: 'Feature Request',
  support_issue: 'Support Issue',
  feedback: 'Feedback',
  bug_report: 'Bug Report',
  question: 'Question',
  other: 'General',
};

export default function AccountManagerNote({
  toName,
  orgName,
  noteCategory,
  notePreview,
  actorName,
  actionUrl,
  baseUrl,
}: AccountManagerNoteProps) {
  const categoryDisplay = categoryDisplayNames[noteCategory] || noteCategory;
  const preview = `New ${categoryDisplay.toLowerCase()} note in ${orgName}`;
  const fullUrl = `${baseUrl}${actionUrl}`;

  return (
    <Layout preview={preview}>
      <Header
        title={`New ${categoryDisplay} note`}
        subtitle={`Activity in ${orgName}`}
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
        <strong>{actorName}</strong> added a new note to a trial you're managing:
      </Text>

      <NotificationCard variant="note">
        <Text
          style={{
            fontSize: '13px',
            color: '#059669',
            fontWeight: '600',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {categoryDisplay}
        </Text>
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

      <Text
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.6',
          margin: '20px 0',
        }}
      >
        This note was added to <strong>{orgName}</strong>. You may want to review it and follow up if needed.
      </Text>

      <div style={{ marginTop: '24px' }}>
        <Button href={fullUrl} variant="success">
          View Note
        </Button>
      </div>

      <Footer baseUrl={baseUrl} />
    </Layout>
  );
}
