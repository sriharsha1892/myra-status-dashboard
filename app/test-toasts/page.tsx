'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TestToastsPage() {
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);

  const handleSuccessToast = () => {
    toast.success('This is a success toast! ✓');
  };

  const handleErrorToast = () => {
    toast.error('This is an error toast! ✗');
  };

  const handleLoadingToast = () => {
    const id = toast.loading('This is a loading toast...');
    setLoadingToastId(id);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      toast.dismiss(id);
      setLoadingToastId(null);
    }, 3000);
  };

  const handleInfoToast = () => {
    toast('This is a default/info toast ℹ️');
  };

  const handleDismissAll = () => {
    toast.dismiss();
    setLoadingToastId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Toast Notification Test
          </h1>
          <p className="text-slate-600 mb-8">
            Click the buttons below to test different toast notification styles.
            Verify that all toasts have solid (non-transparent) backgrounds.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSuccessToast}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Show Success Toast
              </button>

              <button
                onClick={handleErrorToast}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Show Error Toast
              </button>

              <button
                onClick={handleLoadingToast}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                disabled={loadingToastId !== null}
              >
                Show Loading Toast
              </button>

              <button
                onClick={handleInfoToast}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Show Info Toast
              </button>
            </div>

            <button
              onClick={handleDismissAll}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              Dismiss All Toasts
            </button>
          </div>

          <div className="mt-8 p-6 bg-slate-50 rounded-lg border-2 border-slate-200">
            <h2 className="font-semibold text-slate-900 mb-3">
              Expected Behavior:
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Success toast should have a light green solid background (#f0fdf4)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Error toast should have a light red solid background (#fef2f2)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Loading toast should have a light yellow solid background (#fef3c7)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Info toast should have a white solid background (#ffffff)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>All toasts should have 2px borders (not 1px)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>No blurred or transparent backgrounds</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
