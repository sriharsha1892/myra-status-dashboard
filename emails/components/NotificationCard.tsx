/**
 * Notification Card Component
 *
 * Reusable card for displaying notification content in emails
 */

import { Section, Text } from '@react-email/components';

interface NotificationCardProps {
  children: React.ReactNode;
  variant?: 'mention' | 'handoff' | 'note' | 'info';
}

const variantStyles = {
  mention: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  handoff: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  note: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  info: {
    borderColor: '#6B7280',
    backgroundColor: '#F9FAFB',
  },
};

export default function NotificationCard({ children, variant = 'info' }: NotificationCardProps) {
  const styles = variantStyles[variant];

  return (
    <Section
      style={{
        backgroundColor: styles.backgroundColor,
        borderLeft: `4px solid ${styles.borderColor}`,
        borderRadius: '6px',
        padding: '16px',
        margin: '20px 0',
      }}
    >
      {children}
    </Section>
  );
}
