'use client';

/**
 * Admin Imports Page - Glassmorphism Edition
 *
 * A stunning 2025-style interface with frosted glass cards,
 * animated gradients, and floating visual elements.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { StagedRowsTable } from './components/StagedRowsTable';
import { ColumnMapper } from './components/ColumnMapper';
import { InputModeSelector, InputMode } from './components/InputModeSelector';
import { AIParseInput } from './components/AIParseInput';
import { FieldDefinition } from '@/lib/reliableImport/fieldDefinitions';

// ============================================================================
// Types
// ============================================================================

interface BatchSummary {
  batch_id: string;
  batch_name: string;
  entity_type: string;
  status: string;
  total: number;
  pending: number;
  parsed: number;
  validated: number;
  imported: number;
  failed: number;
  skipped: number;
  percent_complete: number;
}

interface BatchRecord {
  batch_id: string;
  batch_name: string;
  entity_type: string;
  status: string;
  total_rows: number;
  imported_count: number;
  failed_count: number;
  created_at: string;
}

type EntityType = 'organization' | 'status_update' | 'activity' | 'myra_usage' | 'prospect';

// ============================================================================
// Animated Background Component
// ============================================================================

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900" />

      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-animated opacity-60" />

      {/* Floating blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-6000" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}

// ============================================================================
// Glass Card Component
// ============================================================================

function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}) {
  return (
    <div className={cn(
      'relative bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-3xl overflow-hidden',
      'shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.08)]',
      hover && 'transition-all duration-300 hover:bg-white/[0.12] hover:border-white/[0.2] hover:shadow-[0_12px_48px_rgba(0,0,0,0.2)] hover:-translate-y-0.5',
      glow && 'animate-glow-pulse',
      className
    )}>
      {/* Inner glow highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

// ============================================================================
// Progress Ring Component
// ============================================================================

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Stat Orb Component
// ============================================================================

function StatOrb({
  value,
  label,
  color = 'purple'
}: {
  value: number;
  label: string;
  color?: 'purple' | 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}) {
  const colorClasses = {
    purple: 'from-purple-500/30 to-purple-700/30 border-purple-500/30 shadow-purple-500/20',
    green: 'from-emerald-500/30 to-emerald-700/30 border-emerald-500/30 shadow-emerald-500/20',
    red: 'from-red-500/30 to-red-700/30 border-red-500/30 shadow-red-500/20',
    yellow: 'from-amber-500/30 to-amber-700/30 border-amber-500/30 shadow-amber-500/20',
    blue: 'from-blue-500/30 to-blue-700/30 border-blue-500/30 shadow-blue-500/20',
    gray: 'from-gray-500/30 to-gray-700/30 border-gray-500/30 shadow-gray-500/20',
  };

  return (
    <div className={cn(
      'stat-orb w-20 h-20 rounded-full flex flex-col items-center justify-center',
      'bg-gradient-to-br backdrop-blur-md border',
      'shadow-[0_0_30px_var(--tw-shadow-color)]',
      colorClasses[color]
    )}>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    preparing: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    ready: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    validating: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse-slow',
    validated: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    importing: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse-slow',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <span className={cn(
      'px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm',
      styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    )}>
      {status}
    </span>
  );
}

// ============================================================================
// Entity Type Pill
// ============================================================================

function EntityPill({
  type,
  label,
  icon,
  selected,
  onClick
}: {
  type: EntityType;
  label: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-selected={selected}
      className={cn(
        'group relative px-4 py-3 rounded-2xl backdrop-blur-md border transition-all duration-300',
        'flex items-center gap-2',
        selected
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white shadow-[0_0_30px_rgba(139,92,246,0.4)]'
          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white'
      )}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 animate-pulse-slow pointer-events-none" />
      )}
    </button>
  );
}

// ============================================================================
// Batch Card Component
// ============================================================================

function BatchCard({
  batch,
  selected,
  onClick
}: {
  batch: BatchRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const percent = batch.total_rows > 0
    ? Math.round((batch.imported_count / batch.total_rows) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-64 p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 text-left',
        'bg-white/[0.06] border-white/[0.1]',
        'hover:bg-white/[0.1] hover:border-white/[0.2] hover:scale-[1.02] hover:shadow-xl',
        selected && 'ring-2 ring-purple-500 shadow-[0_0_40px_rgba(139,92,246,0.3)] bg-white/[0.1]'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-medium text-white text-sm truncate flex-1 mr-2">
          {batch.batch_name}
        </span>
        <StatusBadge status={batch.status} />
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{batch.entity_type}</span>
        <span className="text-white/70">
          {batch.imported_count}/{batch.total_rows}
          {batch.failed_count > 0 && (
            <span className="text-red-400 ml-1">({batch.failed_count} failed)</span>
          )}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminImportsPage() {
  // State
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchSummary | null>(null);
  const [errors, setErrors] = useState<Array<{ row_number: number; error: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New import form
  const [inputMode, setInputMode] = useState<InputMode>('csv');
  const [csvData, setCsvData] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('organization');
  const [batchName, setBatchName] = useState('');

  // Column mapping state
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnMapperData, setColumnMapperData] = useState<{
    csvColumns: string[];
    expectedFields: FieldDefinition[];
    autoMapping: Record<string, string>;
    missingRequired: string[];
  } | null>(null);

  // View mode for batch details
  const [showRowsTable, setShowRowsTable] = useState(false);

  // ============================================================================
  // API Calls
  // ============================================================================

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/imports');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  }, []);

  const fetchBatchDetails = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/imports?batchId=${batchId}`);
      const data = await res.json();
      setSelectedBatch(data.summary);
      setErrors(data.errors || []);
    } catch (error) {
      console.error('Failed to fetch batch details:', error);
    }
  };

  const runAction = async (action: string, batchId?: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          batchId,
          entityType,
          name: batchName || undefined,
          data: csvData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message });

        if (action === 'prepare' && result.batchId) {
          setCsvData('');
          setBatchName('');
          await fetchBatches();
          await fetchBatchDetails(result.batchId);
        } else if (batchId) {
          await fetchBatchDetails(batchId);
          await fetchBatches();
        } else {
          await fetchBatches();
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const exportFailed = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/imports?batchId=${batchId}&action=failed`);
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `failed-rows-${batchId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export' });
    }
  };

  const detectColumns = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect_columns',
          entityType,
          data: csvData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      if (!result.needsMapping) {
        await stageWithMapping(result.autoMapping);
      } else {
        setColumnMapperData({
          csvColumns: result.csvColumns,
          expectedFields: result.expectedFields,
          autoMapping: result.autoMapping,
          missingRequired: result.missingRequired,
        });
        setShowColumnMapper(true);
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const stageWithMapping = async (columnMapping: Record<string, string>) => {
    setIsLoading(true);
    setShowColumnMapper(false);
    setColumnMapperData(null);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare',
          entityType,
          name: batchName || undefined,
          data: csvData,
          columnMapping,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message });
        setCsvData('');
        setBatchName('');
        await fetchBatches();
        await fetchBatchDetails(result.batchId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const stageAIParsedItems = async (items: Record<string, unknown>[]) => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare',
          entityType,
          name: batchName || `AI-parsed ${entityType}s`,
          data: JSON.stringify(items),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message });
        setBatchName('');
        await fetchBatches();
        await fetchBatchDetails(result.batchId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    if (selectedBatch?.status === 'importing' || selectedBatch?.status === 'validating') {
      const interval = setInterval(() => {
        fetchBatchDetails(selectedBatch.batch_id);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedBatch?.status, selectedBatch?.batch_id]);

  // ============================================================================
  // Render
  // ============================================================================

  const entityTypes: { type: EntityType; label: string; icon: string }[] = [
    { type: 'organization', label: 'Organizations', icon: '🏢' },
    { type: 'status_update', label: 'Status Updates', icon: '📊' },
    { type: 'activity', label: 'Activities', icon: '📝' },
    { type: 'myra_usage', label: 'myRA Usage', icon: '🤖' },
    { type: 'prospect', label: 'Prospects', icon: '👤' },
  ];

  return (
    <div className="min-h-screen text-white">
      <AnimatedBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">Data Import Studio</h1>
            <p className="text-white/50">Powerful bulk imports with intelligent parsing</p>
          </div>
          <InputModeSelector mode={inputMode} onChange={setInputMode} />
        </div>

        {/* Message Toast */}
        {message && (
          <div className={cn(
            'mb-6 p-4 rounded-2xl backdrop-blur-xl border animate-slide-up',
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          )}>
            {message.text}
          </div>
        )}

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Entity Selector - Left Column */}
          <div className="lg:col-span-3">
            <GlassCard className="p-6">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
                Data Type
              </h3>
              <div className="flex flex-col gap-2">
                {entityTypes.map(({ type, label, icon }) => (
                  <EntityPill
                    key={type}
                    type={type}
                    label={label}
                    icon={icon}
                    selected={entityType === type}
                    onClick={() => setEntityType(type)}
                  />
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Input Area - Right Column */}
          <div className="lg:col-span-9">
            <GlassCard className="p-6">
              {/* Batch Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/50 mb-2">
                  Batch Name <span className="text-white/30">(optional)</span>
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., December Trial Orgs"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] input-glow transition-all"
                />
              </div>

              {/* CSV Mode */}
              {inputMode === 'csv' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white/50 mb-2">
                      Paste CSV Data
                    </label>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder={
                        entityType === 'organization'
                          ? 'org_name,email,website,domain\nAcme Corp,john@acme.com,acme.com,TMT\n...'
                          : entityType === 'status_update'
                            ? 'org_name,new_status,reason\nAcme Corp,expired,Trial ended\n...'
                            : entityType === 'myra_usage'
                              ? 'org_name,user_name,title,timestamp,cost\n"Acme Corp","John Smith","Base Oil Market","Dec 05, Fri, 02:11 PM","$16.49"\n...'
                              : entityType === 'prospect'
                                ? 'name,org_name,email,title,source\nJohn Smith,Acme Corp,john@acme.com,VP Sales,linkedin\n...'
                                : 'org_name,activity_type,content,date\nAcme Corp,email_sent,Followup email,2024-12-01\n...'
                      }
                      rows={8}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] input-glow transition-all font-mono text-sm resize-none"
                    />
                  </div>

                  <button
                    onClick={detectColumns}
                    disabled={isLoading || !csvData.trim()}
                    className={cn(
                      'btn-shimmer w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300',
                      isLoading || !csvData.trim()
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]'
                    )}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      '✨ Stage for Import'
                    )}
                  </button>

                  {/* Column Mapper Modal */}
                  {showColumnMapper && columnMapperData && (
                    <div className="mt-6">
                      <ColumnMapper
                        csvColumns={columnMapperData.csvColumns}
                        expectedFields={columnMapperData.expectedFields}
                        autoMapping={columnMapperData.autoMapping}
                        missingRequired={columnMapperData.missingRequired}
                        onConfirm={stageWithMapping}
                        onCancel={() => {
                          setShowColumnMapper(false);
                          setColumnMapperData(null);
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* AI Parse Mode */}
              {inputMode === 'ai' && (
                <AIParseInput
                  entityType={entityType}
                  onStage={stageAIParsedItems}
                />
              )}
            </GlassCard>
          </div>
        </div>

        {/* Batch Carousel */}
        {batches.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
              Recent Batches
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 -mb-4 scrollbar-hide snap-x snap-mandatory">
              {batches.slice(0, 10).map((batch) => (
                <BatchCard
                  key={batch.batch_id}
                  batch={batch}
                  selected={selectedBatch?.batch_id === batch.batch_id}
                  onClick={() => fetchBatchDetails(batch.batch_id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Batch Detail Panel */}
        {selectedBatch && (
          <div className="mt-8">
            <GlassCard className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedBatch.batch_name}</h2>
                  <p className="text-white/50 text-sm">{selectedBatch.entity_type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={selectedBatch.status} />
                  <ProgressRing percent={selectedBatch.percent_complete} />
                </div>
              </div>

              {/* Stats Orbs */}
              <div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
                <StatOrb value={selectedBatch.total} label="Total" color="gray" />
                <StatOrb value={selectedBatch.imported} label="Imported" color="green" />
                <StatOrb value={selectedBatch.validated} label="Validated" color="blue" />
                <StatOrb value={selectedBatch.pending} label="Pending" color="yellow" />
                <StatOrb value={selectedBatch.failed} label="Failed" color="red" />
                <StatOrb value={selectedBatch.skipped} label="Skipped" color="gray" />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-6">
                {selectedBatch.status === 'ready' && (
                  <button
                    onClick={() => runAction('validate', selectedBatch.batch_id)}
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-xl font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                  >
                    Validate
                  </button>
                )}

                {selectedBatch.status === 'validated' && selectedBatch.validated > 0 && (
                  <button
                    onClick={() => runAction('import', selectedBatch.batch_id)}
                    disabled={isLoading}
                    className="btn-shimmer px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
                  >
                    Import {selectedBatch.validated} Rows
                  </button>
                )}

                {selectedBatch.status === 'completed' && selectedBatch.failed > 0 && (
                  <>
                    <button
                      onClick={() => runAction('retry', selectedBatch.batch_id)}
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-xl font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-all disabled:opacity-50"
                    >
                      Retry Failed
                    </button>
                    <button
                      onClick={() => exportFailed(selectedBatch.batch_id)}
                      className="px-6 py-2.5 rounded-xl font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      Export Failed
                    </button>
                  </>
                )}

                <button
                  onClick={() => runAction('delete', selectedBatch.batch_id)}
                  disabled={isLoading}
                  className="ml-auto px-6 py-2.5 rounded-xl font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  Delete Batch
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setShowRowsTable(false)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    !showRowsTable
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  )}
                >
                  Summary
                </button>
                <button
                  onClick={() => setShowRowsTable(true)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    showRowsTable
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  )}
                >
                  Edit Rows
                </button>
              </div>

              {showRowsTable ? (
                <StagedRowsTable
                  batchId={selectedBatch.batch_id}
                  entityType={selectedBatch.entity_type}
                  onRowUpdate={() => {
                    fetchBatchDetails(selectedBatch.batch_id);
                    fetchBatches();
                  }}
                />
              ) : (
                <>
                  {errors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white/50 mb-3">Recent Errors</h3>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-h-48 overflow-y-auto">
                        {errors.map((err, i) => (
                          <div key={i} className="text-sm text-red-300 mb-1">
                            <span className="font-medium">Row {err.row_number}:</span> {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </div>
        )}

        {/* Empty State */}
        {!selectedBatch && batches.length === 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border border-white/10 mb-6">
              <svg className="w-12 h-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/70 mb-2">No imports yet</h3>
            <p className="text-white/40">Paste your CSV data above to get started</p>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12">
          <GlassCard className="p-6" hover={false}>
            <h3 className="font-semibold text-white/80 mb-3 flex items-center gap-2">
              <span className="text-lg">💡</span> How it works
            </h3>
            <ol className="text-sm text-white/50 space-y-2 list-decimal list-inside">
              <li>Select the data type and paste your CSV data (or use AI parse)</li>
              <li>Click "Stage for Import" - we&apos;ll auto-detect column mappings</li>
              <li>Click "Validate" to check all rows for errors</li>
              <li>Click "Import" to insert valid rows into the database</li>
              <li>If any rows fail, use "Retry Failed" or "Export Failed" for review</li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
