'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Upload,
  DollarSign,
  Clock,
  Target,
  Users,
  Moon,
  X,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Clipboard,
} from 'lucide-react';
import {
  SyncCategory,
  SYNC_CATEGORIES,
  SyncCategoryOption,
  MatchResult,
  MatchGroup,
  categorizeMatches,
  BulkUpdateResponse,
  SyncWizardStep,
} from '@/lib/sync/types';
import MatchResultsPanel from './MatchResultsPanel';
import SyncOrgEditModal, { SyncOrgFormData } from './SyncOrgEditModal';

const EXAMPLE_DATA = `Acme Corporation
TechStart Inc
Samsung Electronics
Global Solutions Ltd
Innovation Labs`;

// Icon mapping for category cards
const CATEGORY_ICONS: Record<SyncCategoryOption['icon'], React.ComponentType<{ className?: string }>> = {
  dollar: DollarSign,
  clock: Clock,
  sparkles: Sparkles,
  target: Target,
  users: Users,
  moon: Moon,
  x: X,
};

// Color classes for category cards
const CATEGORY_COLORS: Record<SyncCategoryOption['color'], { bg: string; border: string; text: string; iconBg: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconBg: 'bg-green-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconBg: 'bg-amber-100' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', iconBg: 'bg-violet-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', iconBg: 'bg-blue-100' },
  neutral: { bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-700', iconBg: 'bg-neutral-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', iconBg: 'bg-slate-100' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconBg: 'bg-red-100' },
};

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: SyncWizardStep }) {
  const steps: { key: SyncWizardStep; label: string; number: number }[] = [
    { key: 'category', label: 'Select Category', number: 1 },
    { key: 'input', label: 'Enter Names', number: 2 },
    { key: 'results', label: 'Review & Apply', number: 3 },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isComplete = idx < currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : isComplete
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {isComplete ? <CheckCircle className="w-4 h-4" /> : step.number}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-violet-700' : isComplete ? 'text-violet-600' : 'text-neutral-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-4 text-neutral-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Category card component
function CategoryCard({
  category,
  isSelected,
  onClick,
}: {
  category: SyncCategoryOption;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[category.icon];
  const colors = CATEGORY_COLORS[category.color];

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        isSelected
          ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-violet-500`
          : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isSelected ? colors.iconBg : 'bg-neutral-100'}`}>
          <Icon className={`w-5 h-5 ${isSelected ? colors.text : 'text-neutral-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${isSelected ? colors.text : 'text-neutral-900'}`}>
            {category.label}
          </div>
          <div className="text-sm text-neutral-500 mt-0.5">{category.description}</div>
          <div className="text-xs text-neutral-400 mt-2">
            Sets {category.setsField} → <span className="font-medium">{category.setsValue}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Tooltip component
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-10 w-64 p-2 -top-2 left-full ml-2 bg-neutral-800 text-white text-xs rounded-lg shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
}

export default function CustomerSyncTool() {
  const [currentStep, setCurrentStep] = useState<SyncWizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<SyncCategory | null>(null);
  const [inputText, setInputText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<MatchGroup | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pasteDetected, setPasteDetected] = useState<number | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalMode, setEditModalMode] = useState<'edit' | 'create'>('edit');
  const [editModalOrgId, setEditModalOrgId] = useState<string | null>(null);
  const [editModalInitialData, setEditModalInitialData] = useState<
    Partial<SyncOrgFormData> | undefined
  >(undefined);

  // Parse input - support newline, comma, and tab separation
  const parseInputNames = useCallback((): string[] => {
    // First split by newlines
    let names = inputText.split('\n');

    // If only one line and contains commas or tabs, split by those
    if (names.length === 1) {
      if (inputText.includes('\t')) {
        names = inputText.split('\t');
      } else if (inputText.includes(',')) {
        names = inputText.split(',');
      }
    }

    return names
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [inputText]);

  // Handle paste detection
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split(/[\n,\t]/).filter((l) => l.trim()).length;
    if (lines > 1) {
      setPasteDetected(lines);
      setTimeout(() => setPasteDetected(null), 3000);
    }
  }, []);

  // Auto-advance to results when matching completes
  useEffect(() => {
    if (matchResults) {
      setCurrentStep('results');
    }
  }, [matchResults]);

  const handleCategorySelect = useCallback((category: SyncCategory) => {
    setSelectedCategory(category);
  }, []);

  const handleNextFromCategory = useCallback(() => {
    if (selectedCategory) {
      setCurrentStep('input');
    }
  }, [selectedCategory]);

  const handleBackToCategory = useCallback(() => {
    setCurrentStep('category');
  }, []);

  const handleTryExample = useCallback(() => {
    setInputText(EXAMPLE_DATA);
  }, []);

  const handleMatch = useCallback(async () => {
    const names = parseInputNames();
    if (names.length === 0) {
      setMatchError('Please enter at least one company name');
      return;
    }

    if (!selectedCategory) {
      setMatchError('Please select a category first');
      return;
    }

    setIsMatching(true);
    setMatchError(null);
    setMatchResults(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/sync/groq-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, category: selectedCategory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to match names');
      }

      const matches: MatchResult[] = data.matches || [];
      const grouped = categorizeMatches(matches);
      setMatchResults(grouped);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setIsMatching(false);
    }
  }, [parseInputNames, selectedCategory]);

  const handleApply = useCallback(
    async (
      updates: Array<{ org_id: string; category: SyncCategory }>,
      creates: Array<{ name: string; category: SyncCategory }>
    ) => {
      try {
        const response = await fetch('/api/sync/bulk-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, creates }),
        });

        const data: BulkUpdateResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.errors?.[0] || 'Failed to apply changes');
        }

        const messages: string[] = [];
        if (data.updated_count > 0) {
          messages.push(`${data.updated_count} organization(s) updated`);
        }
        if (data.created_count > 0) {
          messages.push(`${data.created_count} organization(s) created`);
        }

        if (data.errors.length > 0) {
          messages.push(`${data.errors.length} error(s)`);
          console.warn('Bulk update errors:', data.errors);
        }

        setSuccessMessage(messages.join(', '));

        // Clear results after successful apply
        setMatchResults(null);
        setInputText('');
        setCurrentStep('category');
      } catch (err) {
        setMatchError(err instanceof Error ? err.message : 'Apply failed');
      }
    },
    []
  );

  const handleEditOrg = useCallback((orgId: string) => {
    setEditModalOrgId(orgId);
    setEditModalMode('edit');
    setEditModalInitialData(undefined);
    setEditModalOpen(true);
  }, []);

  const handleCreateOrg = useCallback(
    (name: string) => {
      setEditModalOrgId(null);
      setEditModalMode('create');
      setEditModalInitialData({
        name,
        ...getCategoryDefaults(selectedCategory!),
      });
      setEditModalOpen(true);
    },
    [selectedCategory]
  );

  const handleModalSave = useCallback(
    async (data: SyncOrgFormData) => {
      const endpoint =
        editModalMode === 'create'
          ? '/api/quote/organizations'
          : `/api/quote/organizations`;

      const method = editModalMode === 'create' ? 'POST' : 'PATCH';
      const body =
        editModalMode === 'create'
          ? data
          : { id: editModalOrgId, updates: data };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save organization');
      }

      setSuccessMessage(
        editModalMode === 'create'
          ? `Created "${data.name}"`
          : 'Organization updated'
      );
    },
    [editModalMode, editModalOrgId]
  );

  const handleReset = useCallback(() => {
    setInputText('');
    setMatchResults(null);
    setMatchError(null);
    setSuccessMessage(null);
    setSelectedCategory(null);
    setCurrentStep('category');
  }, []);

  const inputLineCount = parseInputNames().length;
  const selectedCategoryData = SYNC_CATEGORIES.find((c) => c.value === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Customer Data Sync
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Match and sync customer lists with your organizations database using AI
          </p>
        </div>
        {(currentStep !== 'category' || matchResults) && (
          <button
            onClick={handleReset}
            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Start Over
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {matchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{matchError}</span>
          <button
            onClick={() => setMatchError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Step 1: Category Selection */}
      {currentStep === 'category' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-900">What type of customers are these?</h3>
            <Tooltip content="Select a category to determine what status these organizations will be set to after matching.">
              <HelpCircle className="w-4 h-4 text-neutral-400 cursor-help" />
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SYNC_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.value}
                category={cat}
                isSelected={selectedCategory === cat.value}
                onClick={() => handleCategorySelect(cat.value)}
              />
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleNextFromCategory}
              disabled={!selectedCategory}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Input Names */}
      {currentStep === 'input' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          {/* Selected category badge */}
          {selectedCategoryData && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Selected:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${CATEGORY_COLORS[selectedCategoryData.color].bg} ${CATEGORY_COLORS[selectedCategoryData.color].text}`}>
                {selectedCategoryData.label}
              </span>
              <button
                onClick={handleBackToCategory}
                className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Change
              </button>
            </div>
          )}

          {/* Company Names Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700">
                Company Names
                {inputLineCount > 0 && (
                  <span className="ml-2 text-neutral-500 font-normal">
                    ({inputLineCount} name{inputLineCount !== 1 ? 's' : ''})
                  </span>
                )}
              </label>
              <Tooltip content="Paste a list of company names. Supports newline, comma, or tab-separated formats.">
                <HelpCircle className="w-4 h-4 text-neutral-400 cursor-help" />
              </Tooltip>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Enter company names (one per line, or comma/tab-separated):

Acme Corporation
TechStart Inc
Samsung Electronics
..."
              rows={10}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-y font-mono text-sm"
            />

            {/* Paste detected toast */}
            {pasteDetected && (
              <div className="mt-2 flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                <Clipboard className="w-4 h-4" />
                {pasteDetected} names detected from paste
              </div>
            )}
          </div>

          {/* Helper buttons */}
          <div className="flex items-center gap-4">
            {inputLineCount === 0 && (
              <button
                onClick={handleTryExample}
                className="text-sm text-violet-600 hover:text-violet-700 underline"
              >
                Try example data
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleBackToCategory}
              className="text-neutral-600 hover:text-neutral-800 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleMatch}
              disabled={isMatching || inputLineCount === 0}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isMatching ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Match with AI
                </>
              )}
            </button>
          </div>

          {isMatching && (
            <div className="text-center text-sm text-neutral-500">
              Processing {inputLineCount} name{inputLineCount !== 1 ? 's' : ''}...
            </div>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === 'results' && matchResults && selectedCategory && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-600" />
            <h3 className="font-medium text-neutral-900">Match Results</h3>
            <span className="text-sm text-neutral-500">
              — Review matches and apply changes
            </span>
          </div>
          <MatchResultsPanel
            matchGroups={matchResults}
            selectedCategory={selectedCategory}
            onApply={handleApply}
            onEditOrg={handleEditOrg}
            onCreateOrg={handleCreateOrg}
          />
        </div>
      )}

      {/* Edit Modal */}
      <SyncOrgEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleModalSave}
        initialData={editModalInitialData}
        mode={editModalMode}
      />
    </div>
  );
}

// Helper to get default field values based on category
function getCategoryDefaults(
  category: SyncCategory
): Partial<SyncOrgFormData> {
  switch (category) {
    case 'paying_customers':
      return { status: 'onboarded' };
    case 'trial_users':
      return { trial_status: 'active' };
    case 'new_trials':
      return {
        trial_status: 'active',
        trial_start_date: new Date().toISOString(),
      };
    case 'strong_prospects':
      return { status: 'negotiation' };
    case 'prospects':
      return { status: 'prospect' };
    case 'dormant':
      return { trial_status: 'inactive' };
    case 'lost':
      return { status: 'rejected' };
    default:
      return {};
  }
}
