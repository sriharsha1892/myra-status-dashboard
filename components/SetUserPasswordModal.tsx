'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateTemporaryPassword, hashPassword } from '@/lib/auth/password';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  setUserPasswordSchema,
  PASSWORD_MODES,
} from '@/lib/validation/schemas/userManagement';
import { z } from 'zod';

interface SetUserPasswordModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PasswordMode = typeof PASSWORD_MODES[number];

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

  // Form state
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    mode: 'set' as PasswordMode,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Handle input changes with error clearing
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGeneratePassword = () => {
    const temp = generateTemporaryPassword();
    setGeneratedPassword(temp);
    setFormData({
      ...formData,
      password: temp,
      confirmPassword: temp,
    });
    // Clear any existing errors
    setErrors({});
    toast.success('Temporary password generated. Make sure user changes it on first login!');
  };

  // Validate form with Zod schema
  const validateForm = (): boolean => {
    try {
      setUserPasswordSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        // Hash the password
        const passwordHash = await hashPassword(formData.password);

        // Update user password in database
        const { error } = await supabase
          .from('trial_users')
          .update({
            password_hash: passwordHash,
            last_password_changed_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Password set successfully!',
        errorMessage: 'Failed to set password',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error setting password:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'password_set');

          // Show error with report option
          showErrorWithReport(
            error,
            'password_set',
            errorDetails.message,
            errorDetails.suggestion,
            user?.email,
            user?.id
          );
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      password: '',
      confirmPassword: '',
      mode: 'set',
    });
    setErrors({});
    setGeneratedPassword('');
    setShowPassword(false);
    setMode('set');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Set User Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              {userName} ({userEmail})
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSetPassword} className="p-6 space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Password Mode
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('set');
                  setFormData({ ...formData, mode: 'set' });
                }}
                className={`flex-1 h-10 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === 'set'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Set Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('generate');
                  setFormData({ ...formData, mode: 'generate' });
                  handleGeneratePassword();
                }}
                className={`flex-1 h-10 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === 'generate'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Generate
              </button>
            </div>
          </div>

          {/* Generated Password Display */}
          {mode === 'generate' && generatedPassword && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-semibold mb-2">
                Generated Password:
              </p>
              <code className="block text-lg font-mono text-green-800 bg-green-100 p-3 rounded border border-green-300">
                {generatedPassword}
              </code>
              <p className="text-xs text-green-700 mt-2">
                Please copy this password and securely share it with the user. They should change it on first login.
              </p>
            </div>
          )}

          {/* Password Fields */}
          <div className="space-y-4">
            <FormInput
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
              placeholder="Enter password"
              helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
            />

            <FormInput
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Re-enter password"
              helperText="Must match the password above"
            />

            {/* Show Password Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="showPassword" className="text-sm text-gray-700 cursor-pointer">
                Show password
              </label>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-semibold mb-1">
              Security Reminder
            </p>
            <p className="text-xs text-yellow-800">
              Passwords are securely hashed using bcrypt before storage. Never share passwords over insecure channels.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Setting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Set Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
