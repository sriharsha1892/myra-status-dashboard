/**
 * Trial Handoff Notification Email Template
 *
 * Sent when a trial is handed off to a new account manager
 */

import { Text, Section } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';
import NotificationCard from './components/NotificationCard';
import { TrialHandoffEmailData } from '@/lib/email/types';

interface TrialHandoffNotificationProps extends TrialHandoffEmailData {
  baseUrl: string;
}

export default function TrialHandoffNotification({
  toName,
  orgName,
  previousAccountManager,
  newAccountManager,
  handoffReason,
  contextNotes,
  actionUrl,
  actorName,
  baseUrl,
}: TrialHandoffNotificationProps) {
  const preview = `Trial handoff: You've been assigned ${orgName}`;
  const fullUrl = `${baseUrl}${actionUrl}`;

  return (
    <Layout preview={preview}>
      <Header
        title={`Trial handoff: ${orgName}`}
        subtitle={`You've been assigned as the new account manager`}
      />

      <Text
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.6',
          margin: '0 0 20px 0',
        }}
      >
        {toName ? `Hi ${toName}, ` : 'Hi, '}
        <strong>{actorName}</strong> has handed off this trial to you.
      </Text>

      <NotificationCard variant="handoff">
        <Section>
          <Text
            style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: '0 0 4px 0',
              fontWeight: '600',
            }}
          >
            Previous Account Manager
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#1F2937',
              margin: '0 0 16px 0',
            }}
          >
            {previousAccountManager || 'Unassigned'}
          </Text>

          <Text
            style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: '0 0 4px 0',
              fontWeight: '600',
            }}
          >
            New Account Manager
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#1F2937',
              margin: '0 0 16px 0',
            }}
          >
            {newAccountManager}
          </Text>

          <Text
            style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: '0 0 4px 0',
              fontWeight: '600',
            }}
          >
            Reason for Handoff
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#1F2937',
              margin: contextNotes ? '0 0 16px 0' : '0',
              whiteSpace: 'pre-wrap',
            }}
          >
            {handoffReason}
          </Text>

          {contextNotes && (
            <>
              <Text
                style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: '0 0 4px 0',
                  fontWeight: '600',
                }}
              >
                Additional Context
              </Text>
              <Text
                style={{
                  fontSize: '14px',
                  color: '#1F2937',
                  margin: '0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {contextNotes}
              </Text>
            </>
          )}
        </Section>
      </NotificationCard>

      <Text
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.6',
          margin: '20px 0',
        }}
      >
        Please review the trial details and reach out to {previousAccountManager || 'the previous owner'} if you need any additional context.
      </Text>

      <div style={{ marginTop: '24px' }}>
        <Button href={fullUrl} variant="primary">
          View Trial Details
        </Button>
      </div>

      <Footer baseUrl={baseUrl} />
    </Layout>
  );
}
