import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quote Admin | myRA AI',
  description: 'Admin dashboard for myRA AI quotes',
};

export default function QuoteAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
