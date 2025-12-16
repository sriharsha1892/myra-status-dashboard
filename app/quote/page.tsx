'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import type { QuoteFormData, QuoteRow, ValidationErrors, Currency, DiscountReason, Urgency } from '@/lib/quote/types';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';
import { DEFAULT_QUOTE_FORM, DEFAULT_DEAL_CONTEXT, DISCOUNT_REASONS, URGENCY_OPTIONS } from '@/lib/quote/constants';
import { generateQuotePDF, generateFilename } from '@/lib/quote/pdf-generator';
import { saveDraft, loadDraft, saveToHistory } from '@/lib/quote/storage';
import { isQuoteAuthenticated, setQuoteAuthenticated } from '@/lib/quote/auth';
import { QuotePreviewModal } from '@/components/quote/QuotePreviewModal';
import { QuoteHistory } from '@/components/quote/QuoteHistory';
import { TemplatePresets } from '@/components/quote/TemplatePresets';
import { QuoteAuthModal } from '@/components/quote/QuoteAuthModal';

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data: QuoteFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.preparedFor.trim()) {
    errors.preparedFor = 'Company name is required';
  }

  if (!data.contactName.trim()) {
    errors.contactName = 'Contact name is required';
  }

  if (!data.contactEmail.trim()) {
    errors.contactEmail = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.contactEmail)) {
    errors.contactEmail = 'Please enter a valid email address';
  }

  // Validate investment is a valid number
  const rowErrors: ValidationErrors['rows'] = {};
  data.rows.forEach((row, index) => {
    const offerPrice = row.offerPrice.replace(/[^0-9.]/g, '');

    if (row.offerPrice && isNaN(parseFloat(offerPrice))) {
      if (!rowErrors[index]) rowErrors[index] = {};
      rowErrors[index].offerPrice = 'Must be a valid number';
    }
  });

  if (Object.keys(rowErrors).length > 0) {
    errors.rows = rowErrors;
  }

  return errors;
}

function hasErrors(errors: ValidationErrors): boolean {
  return !!(
    errors.preparedFor ||
    errors.contactName ||
    errors.contactEmail ||
    (errors.rows && Object.keys(errors.rows).length > 0)
  );
}

// Get today's date in ISO format
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Get date 30 days from now in ISO format
function getDefaultValidUntil(fromDate?: string): string {
  const date = fromDate ? new Date(fromDate) : new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

// Generate quote reference: MQ-YYYYMMDD-XXXX
function generateQuoteReference(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MQ-${dateStr}-${random}`;
}

// Calculate total value from rows
function calculateTotalValue(rows: QuoteRow[]): number {
  return rows.reduce((sum, row) => {
    const value = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

// Format number with commas (INR uses Indian numbering)
function formatNumberDisplay(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  if (currency === 'INR') {
    return num.toLocaleString('en-IN');
  }
  return num.toLocaleString('en-US');
}

// Parse formatted number back to raw value
function parseFormattedNumber(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

export default function QuotePage() {
  const [formData, setFormData] = useState<QuoteFormData>(() => {
    const quoteDate = getTodayISO();
    return {
      ...DEFAULT_QUOTE_FORM,
      quoteDate,
      validUntil: getDefaultValidUntil(quoteDate),
      rows: [...DEFAULT_QUOTE_FORM.rows],
      dealContext: { ...DEFAULT_DEAL_CONTEXT },
    };
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [dealContextOpen, setDealContextOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth on mount
  useEffect(() => {
    setIsAuthenticated(isQuoteAuthenticated());
    setAuthChecked(true);
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback(() => {
    setQuoteAuthenticated();
    setIsAuthenticated(true);
  }, []);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setFormData(draft);
    }
  }, []);

  // Auto-save draft with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(formData);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData]);

  // Validate on blur
  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateForm(formData));
  }, [formData]);

  // Update form field
  const updateField = useCallback(<K extends keyof QuoteFormData>(
    field: K,
    value: QuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Update row field
  const updateRow = useCallback((
    index: number,
    field: keyof QuoteRow,
    value: string
  ) => {
    setFormData((prev) => {
      const newRows = [...prev.rows];
      newRows[index] = { ...newRows[index], [field]: value };
      return { ...prev, rows: newRows };
    });
  }, []);

  // Add row
  const addRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        { term: '', users: '', consultingHours: '', listPrice: '', offerPrice: '' },
      ],
    }));
  }, []);

  // Remove row
  const removeRow = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index),
    }));
  }, []);

  // Apply template preset
  const handleApplyPreset = useCallback((rows: QuoteRow[]) => {
    setFormData((prev) => ({
      ...prev,
      rows: rows.map(row => ({ ...row })),
    }));
    toast.success('Template applied');
  }, []);

  // Load quote from history
  const handleLoadQuote = useCallback((data: QuoteFormData) => {
    setFormData(data);
    setErrors({});
    setTouched({});
    toast.success('Quote loaded from history');
  }, []);

  // Clear form
  const handleClearForm = useCallback(() => {
    const quoteDate = getTodayISO();
    setFormData({
      ...DEFAULT_QUOTE_FORM,
      quoteDate,
      validUntil: getDefaultValidUntil(quoteDate),
      rows: [...DEFAULT_QUOTE_FORM.rows],
      dealContext: { ...DEFAULT_DEAL_CONTEXT },
    });
    setErrors({});
    setTouched({});
    setDealContextOpen(false);
    toast.success('Form cleared');
  }, []);

  // Update deal context field
  const updateDealContext = useCallback(<K extends keyof typeof DEFAULT_DEAL_CONTEXT>(
    field: K,
    value: typeof DEFAULT_DEAL_CONTEXT[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      dealContext: { ...prev.dealContext, [field]: value },
    }));
  }, []);

  // Save quote to database
  const saveQuoteToDb = useCallback(async () => {
    try {
      const quoteReference = generateQuoteReference();
      const totalValue = calculateTotalValue(formData.rows);

      const payload = {
        quoteReference,
        companyName: formData.preparedFor,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactTitle: formData.contactTitle || undefined,
        quoteDate: formData.quoteDate,
        validUntil: formData.validUntil,
        currency: formData.currency,
        totalValue,
        lineItems: formData.rows.map(row => ({
          term: row.term,
          users: row.users,
          consultingHours: row.consultingHours,
          investment: row.offerPrice,
        })),
        preparedBy: formData.preparedBy || 'Unknown AM',
        dealContext: {
          discountReason: formData.dealContext.discountReason || undefined,
          specialTerms: formData.dealContext.specialTerms || undefined,
          decisionDate: formData.dealContext.decisionDate || undefined,
          urgency: formData.dealContext.urgency || undefined,
        },
      };

      const response = await fetch('/api/quote/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Failed to save quote to database:', result.error);
      }
    } catch (err) {
      // Don't block the user if DB save fails - just log it
      console.error('Error saving quote to database:', err);
    }
  }, [formData]);

  // Generate PDF
  const handleGenerate = useCallback(async (preview: boolean = false) => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched({
      preparedFor: true,
      contactName: true,
      contactEmail: true,
    });

    if (hasErrors(validationErrors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsGenerating(true);

    try {
      const bytes = await generateQuotePDF(formData);
      const filename = generateFilename(formData);

      setPdfBytes(bytes);
      setPdfFilename(filename);

      if (preview) {
        setPreviewOpen(true);
      } else {
        // Direct download
        downloadPdf(bytes, filename);
        saveToHistory(formData.contactEmail, formData);
        setHistoryRefresh((prev) => prev + 1);

        // Save to database (async, non-blocking)
        saveQuoteToDb();

        toast.success('Quote generated successfully');
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [formData, saveQuoteToDb]);

  // Download PDF
  const downloadPdf = useCallback((bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Handle download from preview modal
  const handleDownloadFromPreview = useCallback(() => {
    if (pdfBytes && pdfFilename) {
      downloadPdf(pdfBytes, pdfFilename);
      saveToHistory(formData.contactEmail, formData);
      setHistoryRefresh((prev) => prev + 1);

      // Save to database (async, non-blocking)
      saveQuoteToDb();

      setPreviewOpen(false);
      toast.success('Quote downloaded');
    }
  }, [pdfBytes, pdfFilename, formData, downloadPdf, saveQuoteToDb]);

  // Input class helper
  const getInputClass = (field: string, hasError: boolean) => {
    const base = 'w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2';
    if (hasError && touched[field]) {
      return `${base} border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50`;
    }
    return `${base} border-neutral-200 focus:border-violet-500 focus:ring-violet-200`;
  };

  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return <QuoteAuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-violet-50/30 to-neutral-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900">
                myRA AI<sup className="text-[10px] ml-0.5 text-neutral-500">®</sup>
              </h1>
              <p className="text-xs text-neutral-500">Quote Generator</p>
            </div>
          </div>
          <Link
            href="/quote/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            title="View all quotes"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Corporate Quotation</h2>
                <p className="text-sm text-violet-200">
                  Generate a professional quote for myRA AI® platform
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Client Details */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-4">Client Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm text-neutral-600 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.preparedFor}
                        onChange={(e) => updateField('preparedFor', e.target.value)}
                        onBlur={() => handleBlur('preparedFor')}
                        className={getInputClass('preparedFor', !!errors.preparedFor)}
                        placeholder="Acme Corporation"
                      />
                      {errors.preparedFor && touched.preparedFor && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.preparedFor}
                        </p>
                      )}
                    </div>

                    {/* Contact Name */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">
                        Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => updateField('contactName', e.target.value)}
                        onBlur={() => handleBlur('contactName')}
                        className={getInputClass('contactName', !!errors.contactName)}
                        placeholder="John Smith"
                      />
                      {errors.contactName && touched.contactName && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.contactName}
                        </p>
                      )}
                    </div>

                    {/* Contact Title */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">
                        Title / Designation
                      </label>
                      <input
                        type="text"
                        value={formData.contactTitle}
                        onChange={(e) => updateField('contactTitle', e.target.value)}
                        className={getInputClass('contactTitle', false)}
                        placeholder="VP of Strategy"
                      />
                    </div>

                    {/* Contact Email */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => updateField('contactEmail', e.target.value)}
                        onBlur={() => handleBlur('contactEmail')}
                        className={getInputClass('contactEmail', !!errors.contactEmail)}
                        placeholder="john@acme.com"
                      />
                      {errors.contactEmail && touched.contactEmail && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.contactEmail}
                        </p>
                      )}
                    </div>

                    {/* Quote Date */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Quote Date</label>
                      <input
                        type="date"
                        value={formData.quoteDate}
                        onChange={(e) => updateField('quoteDate', e.target.value)}
                        className={getInputClass('quoteDate', false)}
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Currency</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => updateField('currency', e.target.value as Currency)}
                        className={getInputClass('currency', false)}
                      >
                        {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                          <option key={code} value={code}>
                            {code} ({symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Valid Until */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Valid Until</label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => updateField('validUntil', e.target.value)}
                        className={getInputClass('validUntil', false)}
                        min={formData.quoteDate}
                      />
                    </div>

                    {/* Prepared By */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Prepared By</label>
                      <input
                        type="text"
                        value={formData.preparedBy}
                        onChange={(e) => updateField('preparedBy', e.target.value)}
                        className={getInputClass('preparedBy', false)}
                        placeholder="Account Manager name"
                      />
                    </div>

                    {/* Confidential Watermark */}
                    <div className="md:col-span-2 flex items-center gap-3 pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showConfidential}
                          onChange={(e) => updateField('showConfidential', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                      <span className="text-sm text-neutral-600">
                        Show CONFIDENTIAL watermark
                      </span>
                    </div>
                  </div>
                </div>

                {/* Investment Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-neutral-700">Investment</h3>
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Row
                    </button>
                  </div>

                  {/* Template Presets */}
                  <div className="mb-4">
                    <TemplatePresets onApplyPreset={handleApplyPreset} />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-violet-600 text-white">
                          <th className="px-3 py-2 text-left font-medium rounded-tl-lg">Term</th>
                          <th className="px-3 py-2 text-left font-medium">Users</th>
                          <th className="px-3 py-2 text-left font-medium">Consulting Hours</th>
                          <th className="px-3 py-2 text-left font-medium">Investment</th>
                          <th className="px-3 py-2 text-center font-medium rounded-tr-lg w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.rows.map((row, index) => (
                          <tr
                            key={index}
                            className={index % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={row.term}
                                onChange={(e) => updateRow(index, 'term', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                placeholder="1-Year"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={row.users}
                                onChange={(e) => updateRow(index, 'users', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                placeholder="10"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={row.consultingHours}
                                onChange={(e) => updateRow(index, 'consultingHours', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                placeholder="500/yr"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={row.offerPrice}
                                onChange={(e) => updateRow(index, 'offerPrice', parseFormattedNumber(e.target.value))}
                                onBlur={() => {
                                  handleBlur(`row_${index}_offerPrice`);
                                  // Auto-format on blur
                                  if (row.offerPrice) {
                                    const formatted = formatNumberDisplay(row.offerPrice, formData.currency);
                                    updateRow(index, 'offerPrice', formatted);
                                  }
                                }}
                                onFocus={() => {
                                  // Remove formatting on focus for easier editing
                                  if (row.offerPrice) {
                                    updateRow(index, 'offerPrice', parseFormattedNumber(row.offerPrice));
                                  }
                                }}
                                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-violet-500 font-medium ${
                                  errors.rows?.[index]?.offerPrice
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-neutral-200'
                                }`}
                                placeholder="60,000"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              {formData.rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRow(index)}
                                  className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Remove row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deal Context (Collapsible) */}
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDealContextOpen(!dealContextOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-neutral-700">Deal Context</h3>
                      {(formData.dealContext.discountReason || formData.dealContext.specialTerms || formData.dealContext.decisionDate) && (
                        <span className="px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">
                          {[
                            formData.dealContext.discountReason,
                            formData.dealContext.specialTerms,
                            formData.dealContext.decisionDate,
                          ].filter(Boolean).length} filled
                        </span>
                      )}
                    </div>
                    {dealContextOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    )}
                  </button>
                  {dealContextOpen && (
                    <div className="p-4 space-y-4 bg-white border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">
                        Internal notes for your reference. Not shown in the PDF.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Discount Reason */}
                        <div>
                          <label className="block text-sm text-neutral-600 mb-1">Discount Reason</label>
                          <select
                            value={formData.dealContext.discountReason}
                            onChange={(e) => updateDealContext('discountReason', e.target.value as DiscountReason | '')}
                            className={getInputClass('discountReason', false)}
                          >
                            <option value="">Select reason...</option>
                            {DISCOUNT_REASONS.map((reason) => (
                              <option key={reason.value} value={reason.value}>
                                {reason.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Decision Date */}
                        <div>
                          <label className="block text-sm text-neutral-600 mb-1">Decision Date</label>
                          <input
                            type="date"
                            value={formData.dealContext.decisionDate}
                            onChange={(e) => updateDealContext('decisionDate', e.target.value)}
                            className={getInputClass('decisionDate', false)}
                          />
                        </div>

                        {/* Urgency */}
                        <div>
                          <label className="block text-sm text-neutral-600 mb-1">Urgency</label>
                          <select
                            value={formData.dealContext.urgency}
                            onChange={(e) => updateDealContext('urgency', e.target.value as Urgency | '')}
                            className={getInputClass('urgency', false)}
                          >
                            <option value="">Select urgency...</option>
                            {URGENCY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Special Terms */}
                        <div className="md:col-span-2">
                          <label className="block text-sm text-neutral-600 mb-1">Special Terms</label>
                          <textarea
                            value={formData.dealContext.specialTerms}
                            onChange={(e) => updateDealContext('specialTerms', e.target.value)}
                            className={`${getInputClass('specialTerms', false)} resize-none`}
                            rows={3}
                            placeholder="Custom conditions, payment terms, SLAs, etc."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="flex items-center gap-2 px-3 py-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Generate PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Footer */}
            <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 rounded-lg border border-violet-100">
              <Info className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-violet-700">
                <p className="font-medium">Client-side generation</p>
                <p className="text-violet-600">
                  This tool generates deterministic PDFs entirely in your browser. No data is sent to
                  any server. Same inputs will always produce identical output.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quote History */}
            <QuoteHistory
              email={formData.contactEmail}
              onLoadQuote={handleLoadQuote}
              refreshTrigger={historyRefresh}
            />

            {/* Tips Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
              <h3 className="font-medium text-neutral-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Quick Tips
              </h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">•</span>
                  <span>Use template presets for quick setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">•</span>
                  <span>Form auto-saves as you type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">•</span>
                  <span>Quote history is tied to email address</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">•</span>
                  <span>INR uses Indian numbering (lakhs)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <QuotePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfBytes={pdfBytes}
        filename={pdfFilename}
        onDownload={handleDownloadFromPreview}
      />
    </div>
  );
}
