'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        copied
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 inline mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 inline mr-2" />
          Copy
        </>
      )}
    </button>
  );
}

interface CopyButtonInlineProps {
  text: string;
  className?: string;
}

export function CopyButtonInline({ text, className = '' }: CopyButtonInlineProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
      )}
    </button>
  );
}
