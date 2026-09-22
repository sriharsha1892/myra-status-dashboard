import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './register.css';

const roobert = localFont({
  src: [
    { path: '../../../public/fonts/roobert/Roobert-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/roobert/Roobert-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/roobert/Roobert-SemiBold.otf', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/roobert/Roobert-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-roobert',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quotes | myRA AI',
  description: 'Every quote the team has sent, grouped by account.',
};

export default function QuoteAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`myra-register ${roobert.variable}`}>{children}</div>;
}
