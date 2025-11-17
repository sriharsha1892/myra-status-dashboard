/**
 * Email Layout Component
 *
 * Base layout wrapper for all email templates
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
} from '@react-email/components';

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export default function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#F3F4F6',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            margin: '40px auto',
            padding: '40px',
            borderRadius: '8px',
            maxWidth: '600px',
          }}
        >
          <Section>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}
