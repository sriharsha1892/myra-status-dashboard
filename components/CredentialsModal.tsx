'use client';

import { useState } from 'react';
import { X, Copy, Check, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api-client';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    name: string;
    email: string;
    password: string;
    role: string;
    emailSent?: boolean;
  };
}

export default function CredentialsModal({
  isOpen,
  onClose,
  credentials,
}: CredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const loginUrl = 'https://myra-status-dashboard.vercel.app/support/login';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllCredentials = () => {
    const fullCredentials = `
${credentials.name} - Login Credentials

Email: ${credentials.email}
Password: ${credentials.password}
Role: ${credentials.role}

Login at: ${loginUrl}

Please change your password after first login.
    `.trim();

    navigator.clipboard.writeText(fullCredentials);
    toast.success('All credentials copied!');
  };

  const handleResendEmail = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/users/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          name: credentials.name,
          password: credentials.password,
          role: credentials.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      toast.success(`Invitation email resent to ${credentials.email}!`);
    } catch (error) {
      toast.error('Failed to resend invitation email');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">User Created Successfully!</h2>
              <p className="text-blue-50 text-sm mt-1">
                {credentials.emailSent ? (
                  <>
                    ✅ Invitation email sent to {credentials.email}
                  </>
                ) : (
                  <>
                    Share these credentials with {credentials.name}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Details</h3>

            {/* Name & Role */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Name</label>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{credentials.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Role</label>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {credentials.role}
                  </span>
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Email Address</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{credentials.email}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(credentials.email, 'Email')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {copiedField === 'Email' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Temporary Password</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-mono text-gray-900 dark:text-white font-bold">{credentials.password}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(credentials.password, 'Password')}
                  className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  {copiedField === 'Password' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Login URL */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Login URL</h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{loginUrl}</p>
              </div>
              <button
                onClick={() => copyToClipboard(loginUrl, 'Login URL')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                {copiedField === 'Login URL' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={copyAllCredentials}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-semibold shadow-lg"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </button>
            <button
              onClick={handleResendEmail}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg"
            >
              <Mail className="w-4 h-4" />
              Resend Email
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              Done
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Next Steps</h4>
            {credentials.emailSent ? (
              <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">✅</span>
                  <span><strong>Invitation email sent!</strong> {credentials.name} will receive their credentials at {credentials.email}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">📧</span>
                  <span>The email includes login link, credentials, and instructions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">🔐</span>
                  <span>User can login immediately - account is already activated!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">💡</span>
                  <span>Optional: You can also share credentials manually (Copy All button above)</span>
                </li>
              </ul>
            ) : (
              <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">1.</span>
                  <span>Copy the credentials using the "Copy All" button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">2.</span>
                  <span>Share them with {credentials.name} via Slack, Email, or Teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">3.</span>
                  <span>User can login immediately - no waiting for emails!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">4.</span>
                  <span>Recommend changing password after first login</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
