'use client';

/**
 * AIParseInput Component - Glassmorphism Edition
 *
 * Text input for unstructured text + AI parsing + editable preview.
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ParsedItem {
  [key: string]: unknown;
}

interface AIParseInputProps {
  entityType: string;
  onStage: (items: ParsedItem[]) => void;
}

export function AIParseInput({ entityType, onStage }: AIParseInputProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [metadata, setMetadata] = useState<{ count: number; confidence: number } | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_parse',
          entityType,
          data: text,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'AI parsing failed');
        return;
      }

      setParsedItems(result.items || []);
      setMetadata(result.metadata);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number, field: string, value: string) => {
    setParsedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleStage = () => {
    if (parsedItems.length > 0) {
      onStage(parsedItems);
      setParsedItems([]);
      setMetadata(null);
      setText('');
    }
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'organization':
        return 'organizations';
      case 'activity':
        return 'activities';
      case 'status_update':
        return 'status updates';
      case 'myra_usage':
        return 'usage records';
      case 'prospect':
        return 'prospects';
      default:
        return 'items';
    }
  };

  const getFieldsToDisplay = () => {
    switch (entityType) {
      case 'organization':
        return ['org_name', 'website_url', 'contact_email', 'contact_name', 'domain_category'];
      case 'activity':
        return ['org_name', 'activity_type', 'subject', 'content', 'activity_date'];
      case 'status_update':
        return ['org_name', 'new_status', 'reason'];
      case 'myra_usage':
        return ['org_name', 'user_name', 'title', 'timestamp', 'cost'];
      case 'prospect':
        return ['name', 'org_name', 'email', 'title', 'source'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Area */}
      {parsedItems.length === 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-2">
              Paste unstructured text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste emails, notes, or any text containing ${getEntityLabel()}...

Example:
"Had a call with John Smith from Acme Corp today. They're interested in the enterprise plan. Their website is acme.com and they're in the tech industry. Follow up next week."`}
              rows={8}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] input-glow transition-all font-mono text-sm resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={isLoading || !text.trim()}
            className={cn(
              'btn-shimmer w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2',
              isLoading || !text.trim()
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Extract with AI
              </>
            )}
          </button>
        </>
      )}

      {/* Preview Parsed Results */}
      {parsedItems.length > 0 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="text-lg">✨</span>
                Extracted {parsedItems.length} {getEntityLabel()}
              </h3>
              {metadata && (
                <p className="text-sm text-white/50">
                  Confidence: {Math.round(metadata.confidence * 100)}%
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setParsedItems([]);
                setMetadata(null);
              }}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Clear &amp; Re-parse
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] border-b border-white/[0.08]">
                <tr>
                  {getFieldsToDisplay().map((field) => (
                    <th
                      key={field}
                      className="px-3 py-3 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider"
                    >
                      {field.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {parsedItems.map((item, index) => (
                  <tr key={index} className="hover:bg-white/[0.04] transition-colors">
                    {getFieldsToDisplay().map((field) => (
                      <td key={field} className="px-3 py-2">
                        <input
                          type="text"
                          value={String(item[field] || '')}
                          onChange={(e) => handleEditItem(index, field, e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-white/20 rounded-lg text-white/80 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setParsedItems([]);
                setMetadata(null);
              }}
              className="px-6 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStage}
              className="btn-shimmer flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all"
            >
              Stage {parsedItems.length} {getEntityLabel()} for Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
