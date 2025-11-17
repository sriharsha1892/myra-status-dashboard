/**
 * Email Footer Component
 *
 * Consistent footer for all email templates with unsubscribe link
 */

import { Hr, Section, Text, Link } from '@react-email/components';

interface FooterProps {
  baseUrl: string;
  unsubscribeUrl?: string;
}

export default function Footer({ baseUrl, unsubscribeUrl }: FooterProps) {
  return (
    <>
      <Hr
        style={{
          borderColor: '#E5E7EB',
          margin: '32px 0 24px 0',
        }}
      />
      <Section>
        <Text
          style={{
            fontSize: '12px',
            color: '#6B7280',
            margin: '0 0 8px 0',
          }}
        >
          Myra Status Dashboard - Notification Email
        </Text>
        <Text
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            margin: '0',
          }}
        >
          {unsubscribeUrl ? (
            <>
              <Link href={unsubscribeUrl} style={{ color: '#6B7280', textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
              {' • '}
            </>
          ) : null}
          <Link href={`${baseUrl}/settings`} style={{ color: '#6B7280', textDecoration: 'underline' }}>
            Notification Settings
          </Link>
        </Text>
      </Section>
    </>
  );
}
