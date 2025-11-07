'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  iconSize?: number;
  successDuration?: number;
}

/**
 * Copy to clipboard button with success feedback
 *
 * Usage:
 * <CopyButton text="user@example.com" label="Email" />
 * <CopyButton text={orgId} showLabel={false} />
 */
export default function CopyButton({
  text,
  label,
  showLabel = false,
  className = '',
  iconSize = 16,
  successDuration = 2000
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers
    e.preventDefault();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-all ${
        copied
          ? 'text-green-600 bg-green-50 hover:bg-green-100'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      } ${className}`}
      title={copied ? 'Copied!' : `Copy ${label || 'to clipboard'}`}
      aria-label={copied ? 'Copied' : `Copy ${label || text}`}
    >
      {copied ? (
        <Check size={iconSize} className="shrink-0" />
      ) : (
        <Copy size={iconSize} className="shrink-0" />
      )}
      {showLabel && (
        <span className="hidden sm:inline">
          {copied ? 'Copied!' : label || 'Copy'}
        </span>
      )}
    </button>
  );
}

/**
 * Inline copy button (minimal, icon only)
 */
export function CopyButtonInline({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy'}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check size={14} className="text-green-600" />
      ) : (
        <Copy size={14} className="text-gray-400 hover:text-gray-600" />
      )}
    </button>
  );
}
