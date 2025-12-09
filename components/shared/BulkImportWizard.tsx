/**
 * Bulk Import Wizard Component
 *
 * Unified UI component for all bulk imports
 * Provides step-by-step import workflow:
 * 1. Upload/Input
 * 2. Preview & Validate
 * 3. Import with Progress
 * 4. Results Display
 *
 * Used by all 7 import tools
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { BulkImporter, ImportProgress, ColumnConfig } from '@/lib/bulkImport/BulkImportFramework';
import { ImportResult, EnrichmentConfig } from './ImportResultsModal';
import ImportResultsModal from './ImportResultsModal';

// =====================================================
// TYPES
// =====================================================

interface BulkImportWizardProps<TInput, TOutput> {
  /** Title of the import wizard */
  title: string;

  /** Description/instructions */
  description?: string;

  /** Importer instance */
  importer: BulkImporter<TInput, TOutput>;

  /** Preview columns configuration */
  previewColumns: ColumnConfig[];

  /** Input method */
  inputMethod: 'file' | 'text' | 'both';

  /** Accepted file types (e.g., '.csv,.xlsx') */
  acceptedFileTypes?: string;

  /** Text input placeholder */
  textPlaceholder?: string;

  /** Callback when import completes */
  onComplete?: (result: ImportResult) => void;

  /** Whether to show preview step */
  showPreview?: boolean;

  /** Max rows to preview */
  maxPreviewRows?: number;

  /**
   * Builder function to create enrichment config from import result
   * If provided, enables post-import data enrichment
   */
  enrichmentConfigBuilder?: (result: ImportResult) => EnrichmentConfig | undefined;
}

type WizardStep = 'input' | 'preview' | 'importing' | 'results';

// =====================================================
// COMPONENT
// =====================================================

export default function BulkImportWizard<TInput, TOutput>({
  title,
  description,
  importer,
  previewColumns,
  inputMethod,
  acceptedFileTypes = '.csv,.xlsx,.xls',
  textPlaceholder = 'Paste your data here...',
  onComplete,
  showPreview = true,
  maxPreviewRows = 10,
  enrichmentConfigBuilder,
}: BulkImportWizardProps<TInput, TOutput>) {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('input');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [previewData, setPreviewData] = useState<TInput[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setInputFile(file);
      setInputText('');
    }
  }, []);

  const handleTextInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
    setInputFile(null);
  }, []);

  const handlePreview = useCallback(async () => {
    const input = inputFile || inputText;
    if (!input) {
      toast.error('Please provide input data');
      return;
    }

    setIsProcessing(true);

    try {
      const preview = await importer.preview(input);

      setPreviewData(preview.items);
      setPreviewErrors(preview.errors.map((e) => e.message));

      if (preview.errors.length > 0 && preview.items.length === 0) {
        toast.error('Failed to parse input data');
      } else {
        setCurrentStep('preview');
        toast.success(`Loaded ${preview.items.length} items for preview`);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error('Failed to preview data');
    } finally {
      setIsProcessing(false);
    }
  }, [inputFile, inputText, importer]);

  const handleImport = useCallback(async () => {
    const input = inputFile || inputText;
    if (!input) {
      toast.error('Please provide input data');
      return;
    }

    setCurrentStep('importing');
    setIsProcessing(true);

    try {
      const result = await importer.import(input, (progress) => {
        setImportProgress(progress);
      });

      setImportResult(result);
      setCurrentStep('results');

      if (result.summary.failed === 0) {
        toast.success(`Successfully imported ${result.summary.successful} ${result.entityPlural}!`);
      } else {
        toast.error(
          `Imported ${result.summary.successful} ${result.entityPlural}, ${result.summary.failed} failed`
        );
      }

      onComplete?.(result);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [inputFile, inputText, importer, onComplete]);

  const handleReset = useCallback(() => {
    setCurrentStep('input');
    setInputFile(null);
    setInputText('');
    setPreviewData([]);
    setPreviewErrors([]);
    setImportProgress(null);
    setImportResult(null);
  }, []);

  const handleSkipPreview = useCallback(() => {
    handleImport();
  }, [handleImport]);

  // =====================================================
  // RENDER STEPS
  // =====================================================

  const renderInputStep = () => (
    <div className="space-y-6">
      {/* Instructions */}
      {description && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">{description}</p>
        </div>
      )}

      {/* File Upload */}
      {(inputMethod === 'file' || inputMethod === 'both') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Upload File
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 flex flex-col items-center px-6 py-8 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {inputFile ? inputFile.name : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {acceptedFileTypes.split(',').join(', ')}
              </span>
              <input
                type="file"
                className="hidden"
                accept={acceptedFileTypes}
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      )}

      {/* Text Input */}
      {(inputMethod === 'text' || inputMethod === 'both') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Or Paste Data
          </label>
          <textarea
            value={inputText}
            onChange={handleTextInput}
            placeholder={textPlaceholder}
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {showPreview ? (
          <>
            <button
              onClick={handleSkipPreview}
              disabled={!inputFile && !inputText}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip Preview & Import
            </button>
            <button
              onClick={handlePreview}
              disabled={!inputFile && !inputText || isProcessing}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  Preview Data
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleImport}
            disabled={!inputFile && !inputText || isProcessing}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Start Import
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Preview Errors */}
      {previewErrors.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Preview Warnings</h4>
              <ul className="mt-2 space-y-1">
                {previewErrors.map((error, index) => (
                  <li key={index} className="text-sm text-yellow-800">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                {previewColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.slice(0, maxPreviewRows).map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  {previewColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                      {col.formatter
                        ? col.formatter((item as any)[col.key])
                        : String((item as any)[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewData.length > maxPreviewRows && (
        <p className="text-sm text-gray-600 text-center">
          Showing {maxPreviewRows} of {previewData.length} items
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={previewData.length === 0 || isProcessing}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              Import {previewData.length} Items
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />

      {importProgress && (
        <div className="w-full max-w-md space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {importProgress.message}
              </span>
              <span className="text-sm font-medium text-blue-600">
                {importProgress.percentComplete}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress.percentComplete}%` }}
              />
            </div>
          </div>

          {importProgress.currentItem !== undefined && importProgress.totalItems !== undefined && (
            <p className="text-sm text-gray-600 text-center">
              Processing {importProgress.currentItem} of {importProgress.totalItems} items
            </p>
          )}
        </div>
      )}

      <p className="text-gray-600">Please wait while we import your data...</p>
    </div>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        {currentStep !== 'input' && currentStep !== 'results' && (
          <div className="mt-4 flex items-center gap-2">
            {['input', 'preview', 'importing'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : ['input', 'preview'].indexOf(currentStep) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {['input', 'preview'].indexOf(currentStep) > index ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                  {step}
                </span>
                {index < 2 && (
                  <ArrowRight className="w-4 h-4 mx-2 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        {currentStep === 'input' && renderInputStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'importing' && renderImportingStep()}
      </div>

      {/* Results Modal with optional enrichment */}
      {importResult && (
        <ImportResultsModal
          isOpen={currentStep === 'results'}
          onClose={handleReset}
          result={importResult}
          enrichmentConfig={enrichmentConfigBuilder?.(importResult)}
        />
      )}
    </div>
  );
}
