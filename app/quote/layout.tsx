import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quote Generator | myRA AI',
  description: 'Generate professional quotes for myRA AI platform subscriptions',
};

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
