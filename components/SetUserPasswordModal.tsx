'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validatePasswordStrength, generateTemporaryPassword, hashPassword } from '@/lib/auth/password';
import toast from 'react-hot-toast';

interface SetUserPasswordModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PasswordMode = 'set' | 'generate';

export default function SetUserPasswordModal({
  isOpen,
  userName,
  userEmail,
  userId,
  onClose,
  onSuccess,
}: SetUserPasswordModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<PasswordMode>('set');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] as string[] });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    if (value) {
      const validation = validatePasswordStrength(value);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({ isValid: true, errors: [] });
    }
  };

  const handleGeneratePassword = () => {
    const temp = generateTemporaryPassword();
    setGeneratedPassword(temp);
    setPassword(temp);
    setConfirmPassword(temp);
    toast.success('Temporary password generated. Make sure user changes it on first login!');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!password || !confirmPassword) {
        toast.error('Both password fields are required');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        setLoading(false);
        return;
      }

      const validation = validatePasswordStrength(password);
      if (!validation.isValid) {
        toast.error('Password does not meet requirements');
        setLoading(false);
        return;
      }

      // Hash the password
      const passwordHash = await hashPassword(password);

      // Update user password in database
      const { error } = await supabase
        .from('trial_users')
        .update({
          password_hash: passwordHash,
          last_password_changed_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Password set successfully!');
      setPassword('');
      setConfirmPassword('');
      setGeneratedPassword('');
      setMode('set');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error('Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Set Password</h2>
            <p className="text-purple-100 text-sm mt-1">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('set')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition ${
                mode === 'set'
                  ? 'bg-accent-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Set Password
            </button>
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition ${
                mode === 'generate'
                  ? 'bg-accent-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Auto Generate
            </button>
          </div>

          {/* Set Password Mode */}
          {mode === 'set' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter secure password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-900 mb-2">Password must contain:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className={/^.{8,}$/.test(password) ? 'line-through text-green-700' : ''}>
                    • At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'line-through text-green-700' : ''}>
                    • Uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(password) ? 'line-through text-green-700' : ''}>
                    • Lowercase letter (a-z)
                  </li>
                  <li className={/\d/.test(password) ? 'line-through text-green-700' : ''}>
                    • Number (0-9)
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'line-through text-green-700' : ''}>
                    • Special character (!@#$%^&* etc)
                  </li>
                </ul>
              </div>

              {/* Error Messages */}
              {!passwordValidation.isValid && password && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-900 mb-2">Issues:</p>
                  <ul className="text-xs text-red-800 space-y-1">
                    {passwordValidation.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !passwordValidation.isValid || !password}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Setting...' : 'Set Password'}
                </button>
              </div>
            </form>
          )}

          {/* Generate Password Mode */}
          {mode === 'generate' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate a temporary password for this user. They should change it on their first login.
              </p>

              {generatedPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Password
                  </label>
                  <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-lg font-bold text-gray-900">
                        {generatedPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword);
                          toast.success('Copied to clipboard!');
                        }}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ This password will not be visible again. Share it with the user securely.
                  </p>
                </div>
              )}

              {!generatedPassword ? (
                <button
                  onClick={handleGeneratePassword}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Generate Password
                </button>
              ) : (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Setting...' : 'Confirm & Set Password'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 border-t p-4">
          <p className="text-xs text-gray-600">
            🔒 Passwords are encrypted using bcrypt. Admins cannot view passwords. Users can reset their password anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
