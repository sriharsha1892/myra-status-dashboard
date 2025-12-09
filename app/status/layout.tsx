import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'myRA AI System Status',
  description: 'Real-time status and health monitoring for myRA AI services. Check service availability, incidents, and scheduled maintenance.',
  keywords: ['myRA AI', 'system status', 'service health', 'uptime', 'incidents'],
  authors: [{ name: 'myRA AI' }],
  openGraph: {
    title: 'myRA AI System Status',
    description: 'Real-time status and health monitoring for myRA AI services. Check service availability, incidents, and scheduled maintenance.',
    type: 'website',
    siteName: 'myRA AI Status',
    locale: 'en_US',
    images: [
      {
        url: '/og-status.png',
        width: 1200,
        height: 630,
        alt: 'myRA AI System Status Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myRA AI System Status',
    description: 'Real-time status and health monitoring for myRA AI services.',
    images: ['/og-status.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
