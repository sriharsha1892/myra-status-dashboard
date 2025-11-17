/**
 * Email Header Component
 *
 * Consistent header for all email templates
 */

import { Heading, Section } from '@react-email/components';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <Section style={{ marginBottom: '32px' }}>
      <Heading
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0',
          lineHeight: '1.3',
        }}
      >
        {title}
      </Heading>
      {subtitle && (
        <div
          style={{
            fontSize: '14px',
            color: '#6B7280',
            margin: '0',
          }}
        >
          {subtitle}
        </div>
      )}
    </Section>
  );
}
