import { redirect } from 'next/navigation';

// Redirect /support to /support/login
export default function SupportPage() {
  redirect('/support/login');
}
