/**
 * Email Button Component
 *
 * Reusable button for email templates with consistent styling
 */

import { Button as ReactEmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

const variantStyles = {
  primary: {
    backgroundColor: '#4F46E5',
    color: '#ffffff',
  },
  secondary: {
    backgroundColor: '#6B7280',
    color: '#ffffff',
  },
  success: {
    backgroundColor: '#10B981',
    color: '#ffffff',
  },
  danger: {
    backgroundColor: '#EF4444',
    color: '#ffffff',
  },
};

export default function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <ReactEmailButton
      href={href}
      style={{
        ...styles,
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        textDecoration: 'none',
        textAlign: 'center',
        display: 'inline-block',
        padding: '12px 24px',
        lineHeight: '1.5',
      }}
    >
      {children}
    </ReactEmailButton>
  );
}
