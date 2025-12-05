'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AnimatedBackground from '@/components/AnimatedBackground';

type Theme = 'dark' | 'light';
type Size = 'compact' | 'standard' | 'large';

interface WidgetConfig {
  theme: Theme;
  size: Size;
  showProviders: boolean;
  providers: string;
}

export default function WidgetDemoPage() {
  const [config, setConfig] = useState<WidgetConfig>({
    theme: 'dark',
    size: 'standard',
    showProviders: true,
    providers: 'all',
  });
  const [copied, setCopied] = useState(false);
  const [widgetData, setWidgetData] = useState<any>(null);
  const [baseUrl, setBaseUrl] = useState('');

  // Get the base URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // Fetch widget data for preview
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widget');
        const data = await response.json();
        setWidgetData(data);
      } catch (error) {
        console.error('Failed to fetch widget data:', error);
      }
    };
    fetchData();
  }, []);

  // Generate embed code
  const generateEmbedCode = () => {
    const attrs = [
      `src="${baseUrl}/widget.js"`,
      `data-theme="${config.theme}"`,
      `data-size="${config.size}"`,
    ];

    if (!config.showProviders) {
      attrs.push('data-show-providers="false"');
    }

    if (config.providers !== 'all') {
      attrs.push(`data-providers="${config.providers}"`);
    }

    return `<script ${attrs.join('\n  ')}></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Status colors for preview
  const STATUS_COLORS = {
    dark: {
      operational: { bg: 'bg-emerald-900/60', border: 'border-emerald-500', text: 'text-emerald-200', dot: 'bg-emerald-500' },
      degraded: { bg: 'bg-amber-900/60', border: 'border-amber-500', text: 'text-amber-200', dot: 'bg-amber-500' },
      outage: { bg: 'bg-red-900/60', border: 'border-red-500', text: 'text-red-200', dot: 'bg-red-500' },
    },
    light: {
      operational: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', dot: 'bg-emerald-500' },
      degraded: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', dot: 'bg-amber-500' },
      outage: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800', dot: 'bg-red-500' },
    },
  };

  const SIZE_CONFIG = {
    compact: { padding: 'px-3 py-2', fontSize: 'text-xs', dotSize: 'w-2 h-2', gap: 'gap-1.5' },
    standard: { padding: 'px-4 py-3', fontSize: 'text-sm', dotSize: 'w-2.5 h-2.5', gap: 'gap-2' },
    large: { padding: 'px-5 py-4', fontSize: 'text-base', dotSize: 'w-3 h-3', gap: 'gap-2.5' },
  };

  const previewStatus = widgetData?.overallStatus || 'operational';
  const previewColors = STATUS_COLORS[config.theme][previewStatus as keyof typeof STATUS_COLORS['dark']];
  const sizeConfig = SIZE_CONFIG[config.size];

  return (
    <div className="min-h-screen pb-10 relative">
      <AnimatedBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-b from-purple-500/[0.04] to-slate-900/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/status"
                className="text-white/60 hover:text-white/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">
                Status Widget
              </h1>
            </div>
            <span className="text-[13px] text-white/40">Embed Generator</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Embed Status Widget</h2>
          <p className="text-white/60">
            Add a real-time status indicator to your website. The widget automatically updates
            and links back to the full status page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className={cn(
              'p-6 rounded-2xl',
              'bg-white/[0.03] backdrop-blur-xl',
              'border border-white/10'
            )}>
              <h3 className="text-lg font-semibold text-white mb-5">Configuration</h3>

              {/* Theme */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white/70 mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light'] as Theme[]).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setConfig((prev) => ({ ...prev, theme }))}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium capitalize',
                        'border transition-all duration-200',
                        config.theme === theme
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      )}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white/70 mb-2">Size</label>
                <div className="flex gap-2">
                  {(['compact', 'standard', 'large'] as Size[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setConfig((prev) => ({ ...prev, size }))}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium capitalize',
                        'border transition-all duration-200',
                        config.size === size
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show Providers Toggle */}
              <div className="mb-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setConfig((prev) => ({ ...prev, showProviders: !prev.showProviders }))}
                    className={cn(
                      'w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer',
                      config.showProviders ? 'bg-blue-500' : 'bg-white/20'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                        config.showProviders ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium text-white/70">
                    Show provider list (large size only)
                  </span>
                </label>
              </div>

              {/* Provider Filter */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Providers to show
                </label>
                <input
                  type="text"
                  value={config.providers}
                  onChange={(e) => setConfig((prev) => ({ ...prev, providers: e.target.value }))}
                  placeholder="all, or comma-separated IDs"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder:text-white/30',
                    'focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20',
                    'transition-all duration-200'
                  )}
                />
                <p className="text-xs text-white/40 mt-2">
                  Use &quot;all&quot; to show all providers, or enter comma-separated provider IDs
                </p>
              </div>
            </div>

            {/* Embed Code */}
            <div className={cn(
              'p-6 rounded-2xl',
              'bg-white/[0.03] backdrop-blur-xl',
              'border border-white/10'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Embed Code</h3>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'flex items-center gap-2 transition-all duration-200',
                    copied
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                  )}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <pre className={cn(
                'p-4 rounded-xl overflow-x-auto',
                'bg-black/30 border border-white/10',
                'text-sm text-white/80 font-mono'
              )}>
                {generateEmbedCode()}
              </pre>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className={cn(
              'p-6 rounded-2xl',
              'bg-white/[0.03] backdrop-blur-xl',
              'border border-white/10'
            )}>
              <h3 className="text-lg font-semibold text-white mb-5">Preview</h3>

              {/* Widget Preview */}
              <div className={cn(
                'p-8 rounded-xl flex items-center justify-center',
                config.theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'
              )}>
                {widgetData ? (
                  <div
                    className={cn(
                      'inline-flex flex-col rounded-lg border cursor-pointer',
                      'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                      sizeConfig.padding,
                      previewColors.bg,
                      previewColors.border
                    )}
                  >
                    <div className={cn('flex items-center', sizeConfig.gap)}>
                      <span className={cn(
                        'rounded-full',
                        sizeConfig.dotSize,
                        previewColors.dot,
                        previewStatus !== 'operational' && 'animate-pulse'
                      )} />
                      <span className={cn(
                        'font-medium',
                        sizeConfig.fontSize,
                        previewColors.text
                      )}>
                        {widgetData.statusMessage}
                      </span>
                      {config.size !== 'compact' && widgetData.servicesTotal > 0 && (
                        <span className={cn(
                          'opacity-70',
                          sizeConfig.fontSize === 'text-xs' ? 'text-[10px]' : 'text-xs',
                          previewColors.text
                        )}>
                          ({widgetData.servicesOperational}/{widgetData.servicesTotal})
                        </span>
                      )}
                    </div>

                    {/* Provider list for large size */}
                    {config.showProviders && config.size === 'large' && widgetData.providers?.length > 0 && (
                      <div className={cn(
                        'mt-3 pt-3 border-t flex flex-col gap-1',
                        config.theme === 'dark' ? 'border-white/10' : 'border-black/10'
                      )}>
                        {widgetData.providers.slice(0, 5).map((provider: any) => {
                          const pStatus = provider.status === 'operational' ? 'operational' :
                                         provider.status.includes('outage') ? 'outage' : 'degraded';
                          const pColors = STATUS_COLORS[config.theme][pStatus as keyof typeof STATUS_COLORS['dark']];
                          return (
                            <div key={provider.id} className="flex items-center gap-1.5">
                              <span className={cn('w-1.5 h-1.5 rounded-full', pColors.dot)} />
                              <span className={cn('text-xs', previewColors.text)}>
                                {provider.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-white/40 text-sm">Loading preview...</div>
                )}
              </div>

              <p className="text-xs text-white/40 mt-4 text-center">
                Click the widget to open the full status page
              </p>
            </div>

            {/* Usage Notes */}
            <div className={cn(
              'p-6 rounded-2xl',
              'bg-white/[0.03] backdrop-blur-xl',
              'border border-white/10'
            )}>
              <h3 className="text-lg font-semibold text-white mb-4">Usage Notes</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">1.</span>
                  <span>Paste the embed code into your HTML where you want the widget to appear</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">2.</span>
                  <span>The widget automatically fetches status updates every 60 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">3.</span>
                  <span>Clicking the widget opens the full status page in a new tab</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">4.</span>
                  <span>For custom refresh intervals, add <code className="text-blue-300 bg-white/10 px-1 rounded">data-refresh=&quot;30000&quot;</code> (milliseconds)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-sm text-white/60">
            <a href="/status" className="text-blue-400 hover:underline">
              Back to Status Page
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
