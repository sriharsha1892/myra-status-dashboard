'use client';

/**
 * Week 1 Features Test Page
 *
 * Comprehensive test page for all Week 1 improvements:
 * - Accessible form components (FormInput, FormTextarea, FormSelect)
 * - Skeleton loaders
 * - useLoadingState hook
 * - Zod validation
 */

import { useState } from 'react';
import { FormInput, FormTextarea, FormSelect } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import {
  Skeleton,
  SkeletonCard,
  SkeletonCardSimple,
  SkeletonTable,
  SkeletonHeader,
  SkeletonForm,
  SkeletonDetail,
  SkeletonModal,
  SkeletonList,
  SkeletonStats,
} from '@/components/skeletons';
import { useLoadingState } from '@/lib/hooks';
import { z } from 'zod';
import { emailSchema, phoneSchema, nonEmptyString } from '@/lib/validation/schemas/common';

// Form validation schema
const testFormSchema = z.object({
  name: nonEmptyString('Name'),
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().min(10, 'Message must be at least 10 characters'),
  priority: z.string().min(1, 'Please select a priority'),
});

type TestFormData = z.infer<typeof testFormSchema>;

const priorityOptions: SelectOption[] = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent', disabled: false },
];

export default function Week1FeaturesTestPage() {
  // Form state
  const [formData, setFormData] = useState<Partial<TestFormData>>({
    name: '',
    email: '',
    phone: '',
    message: '',
    priority: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSkeletons, setShowSkeletons] = useState(false);

  // Loading state hook
  const { isLoading, error, execute } = useLoadingState<{ success: boolean }>();

  const handleInputChange = (field: keyof TestFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      testFormSchema.parse(formData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { success: true };
      },
      {
        successMessage: 'Form submitted successfully!',
        errorMessage: 'Failed to submit form',
        showLoadingToast: true,
        loadingMessage: 'Submitting form...',
        onSuccess: (data) => {
          console.log('Form submitted:', data);
          // Reset form
          setFormData({
            name: '',
            email: '',
            phone: '',
            message: '',
            priority: '',
          });
        },
      }
    );
  };

  const triggerError = async () => {
    await execute(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        throw new Error('Test error triggered');
      },
      {
        errorMessage: (error) => `Error: ${error.message}`,
        showLoadingToast: true,
      }
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Week 1 Features Test Page
          </h1>
          <p className="text-neutral-600">
            Comprehensive testing page for validation, forms, skeletons, and loading states
          </p>
        </div>

        {/* Section 1: Form Components with Validation */}
        <section className="bg-white rounded-xl p-6 shadow-sm" data-testid="form-section">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            1. Accessible Form Components + Validation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Full Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              helperText="Enter your full name"
              placeholder="John Doe"
              data-testid="name-input"
            />

            <FormInput
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              helperText="We'll never share your email"
              placeholder="john@example.com"
              data-testid="email-input"
            />

            <FormInput
              label="Phone Number"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={errors.phone}
              helperText="Include country code if international"
              placeholder="+1 (555) 123-4567"
              data-testid="phone-input"
            />

            <FormTextarea
              label="Message"
              required
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              error={errors.message}
              helperText="Minimum 10 characters required"
              placeholder="Type your message here..."
              rows={4}
              showCharCount
              maxLength={500}
              data-testid="message-textarea"
            />

            <FormSelect
              label="Priority Level"
              required
              options={priorityOptions}
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              error={errors.priority}
              helperText="Select the urgency level"
              placeholder="Select priority..."
              data-testid="priority-select"
            />

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                data-testid="submit-button"
              >
                {isLoading ? 'Submitting...' : 'Submit Form'}
              </button>

              <button
                type="button"
                onClick={validateForm}
                className="px-6 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                data-testid="validate-button"
              >
                Validate Only
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="form-error">
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            )}
          </form>
        </section>

        {/* Section 2: Loading State Hook */}
        <section className="bg-white rounded-xl p-6 shadow-sm" data-testid="loading-section">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            2. useLoadingState Hook
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={triggerError}
                disabled={isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                data-testid="trigger-error-button"
              >
                Trigger Error
              </button>

              <span className="text-sm text-neutral-600">
                Loading: <span data-testid="loading-state">{isLoading ? 'true' : 'false'}</span>
              </span>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="error-display">
                <p className="text-sm font-medium text-red-700">Error occurred:</p>
                <p className="text-sm text-red-600 mt-1">{error.message}</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Skeleton Loaders */}
        <section className="bg-white rounded-xl p-6 shadow-sm" data-testid="skeleton-section">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            3. Skeleton Loaders
          </h2>

          <button
            onClick={() => setShowSkeletons(!showSkeletons)}
            className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="toggle-skeletons-button"
          >
            {showSkeletons ? 'Hide' : 'Show'} Skeletons
          </button>

          {showSkeletons && (
            <div className="space-y-8">
              {/* Base Skeleton */}
              <div data-testid="skeleton-base">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Base Skeleton</h3>
                <Skeleton className="h-8 w-64" />
              </div>

              {/* Skeleton Card */}
              <div data-testid="skeleton-card">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Card (Enhanced)</h3>
                <SkeletonCard />
              </div>

              {/* Skeleton Card Simple */}
              <div data-testid="skeleton-card-simple">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Card (Simple)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <SkeletonCardSimple />
                  <SkeletonCardSimple />
                  <SkeletonCardSimple />
                </div>
              </div>

              {/* Skeleton Table */}
              <div data-testid="skeleton-table">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Table</h3>
                <SkeletonTable rows={3} />
              </div>

              {/* Skeleton Header */}
              <div data-testid="skeleton-header">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Header</h3>
                <SkeletonHeader />
              </div>

              {/* Skeleton Form */}
              <div data-testid="skeleton-form">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Form</h3>
                <SkeletonForm fields={4} />
              </div>

              {/* Skeleton Detail */}
              <div data-testid="skeleton-detail">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Detail</h3>
                <SkeletonDetail />
              </div>

              {/* Skeleton Modal */}
              <div data-testid="skeleton-modal">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Modal</h3>
                <div className="max-w-md">
                  <SkeletonModal />
                </div>
              </div>

              {/* Skeleton List */}
              <div data-testid="skeleton-list">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton List</h3>
                <SkeletonList items={3} />
              </div>

              {/* Skeleton Stats */}
              <div data-testid="skeleton-stats">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Skeleton Stats</h3>
                <SkeletonStats columns={4} />
              </div>
            </div>
          )}
        </section>

        {/* Section 4: ARIA & Accessibility */}
        <section className="bg-white rounded-xl p-6 shadow-sm" data-testid="accessibility-section">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            4. Accessibility Features
          </h2>

          <div className="space-y-4 text-neutral-700">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong>ARIA Attributes:</strong> All form components include aria-required, aria-invalid, and aria-describedby
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong>Screen Reader Support:</strong> Error messages use role="alert" and aria-live="polite"
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong>WCAG AA Colors:</strong> All text meets 4.5:1 contrast ratio requirements
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong>Keyboard Navigation:</strong> All interactive elements are keyboard accessible
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong>Focus Indicators:</strong> Visible focus rings with accessible colors
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
