'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowRightLeft,
  FileCheck,
} from 'lucide-react';
import type { QuoteFormData, QuoteRow, ValidationErrors, Currency, DiscountReason, Urgency, PaymentFrequency, PaymentBasis, NetTerms, PaymentTerms } from '@/lib/quote/types';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';
import { DEFAULT_QUOTE_FORM, DEFAULT_DEAL_CONTEXT, DISCOUNT_REASONS, URGENCY_OPTIONS, ACCOUNT_MANAGERS, TERM_OPTIONS, CURRENCY_RATES, PAYMENT_FREQUENCY_OPTIONS, PAYMENT_BASIS_OPTIONS, NET_TERMS_OPTIONS, DEFAULT_PAYMENT_TERMS } from '@/lib/quote/constants';
import { generateQuotePDF, generateFilename } from '@/lib/quote/pdf-generator';
import { generateQuoteWord, generateQuoteWordFilename } from '@/lib/quote/docx-generator';
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

// Calculate discount percentage between list price and offer price
function calculateDiscountPercent(listPrice: string, offerPrice: string): { percent: number | null; isNegative: boolean } {
  const list = parseFloat(parseFormattedNumber(listPrice));
  const offer = parseFloat(parseFormattedNumber(offerPrice));

  if (isNaN(list) || isNaN(offer) || list === 0) {
    return { percent: null, isNegative: false };
  }

  const percent = ((list - offer) / list) * 100;
  return { percent: Math.abs(percent), isNegative: percent < 0 };
}

// Convert currency value
function convertCurrencyValue(value: string, fromCurrency: Currency, toCurrency: Currency): string {
  const num = parseFloat(parseFormattedNumber(value));
  if (isNaN(num) || num === 0) return value;

  const fromRate = CURRENCY_RATES[fromCurrency] || 1;
  const toRate = CURRENCY_RATES[toCurrency] || 1;
  const inUSD = num / fromRate;
  const converted = Math.round(inUSD * toRate);
  return String(converted);
}

// Check if term is a standard option
function isStandardTerm(term: string): boolean {
  return TERM_OPTIONS.some(opt => opt.value === term && opt.value !== 'custom');
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
      paymentTerms: { ...DEFAULT_PAYMENT_TERMS },
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
  const [paymentTermsOpen, setPaymentTermsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [customTermRows, setCustomTermRows] = useState<Set<number>>(new Set());
  const [currencyConversionPrompt, setCurrencyConversionPrompt] = useState<{
    show: boolean;
    fromCurrency: Currency;
    toCurrency: Currency;
  } | null>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Show save indicator
      setShowSaveIndicator(true);

      // Clear any existing indicator timeout
      if (saveIndicatorTimeoutRef.current) {
        clearTimeout(saveIndicatorTimeoutRef.current);
      }

      // Hide indicator after 2 seconds
      saveIndicatorTimeoutRef.current = setTimeout(() => {
        setShowSaveIndicator(false);
      }, 2000);
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
    // Auto-populate email if missing (for old history entries)
    const preparedByEmail = data.preparedByEmail ||
      (data.preparedBy ? ACCOUNT_MANAGERS.find(am => am.name === data.preparedBy)?.email || '' : '');

    setFormData({ ...data, preparedByEmail });
    setErrors({});
    setTouched({});
    toast.success('Quote loaded from history');
  }, []);

  // Clear form - shows confirmation first
  const handleClearFormClick = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  // Actually clear the form after confirmation
  const handleClearFormConfirm = useCallback(() => {
    const quoteDate = getTodayISO();
    setFormData({
      ...DEFAULT_QUOTE_FORM,
      quoteDate,
      validUntil: getDefaultValidUntil(quoteDate),
      rows: [...DEFAULT_QUOTE_FORM.rows],
      dealContext: { ...DEFAULT_DEAL_CONTEXT },
      paymentTerms: { ...DEFAULT_PAYMENT_TERMS },
    });
    setErrors({});
    setTouched({});
    setDealContextOpen(false);
    setPaymentTermsOpen(false);
    setShowClearConfirm(false);
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

  // Update payment terms field
  const updatePaymentTerms = useCallback(<K extends keyof PaymentTerms>(
    field: K,
    value: PaymentTerms[K]
  ) => {
    setFormData((prev) => {
      const newTerms = { ...prev.paymentTerms, [field]: value };
      // Clear netTerms if basis is changed to immediate
      if (field === 'basis' && value === 'immediate') {
        delete newTerms.netTerms;
      }
      // Set default netTerms if basis is changed to invoice or msa
      if (field === 'basis' && (value === 'invoice' || value === 'msa') && !prev.paymentTerms.netTerms) {
        newTerms.netTerms = 'net-60';
      }
      return { ...prev, paymentTerms: newTerms };
    });
  }, []);

  // Handle currency change with conversion prompt
  const handleCurrencyChange = useCallback((newCurrency: Currency) => {
    const hasValues = formData.rows.some(row =>
      parseFormattedNumber(row.listPrice) || parseFormattedNumber(row.offerPrice)
    ) || parseFormattedNumber(formData.additionalHourRate);

    if (hasValues && formData.currency !== newCurrency) {
      setCurrencyConversionPrompt({
        show: true,
        fromCurrency: formData.currency,
        toCurrency: newCurrency,
      });
    } else {
      updateField('currency', newCurrency);
    }
  }, [formData.rows, formData.additionalHourRate, formData.currency, updateField]);

  // Apply currency conversion
  const applyCurrencyConversion = useCallback((convert: boolean) => {
    if (!currencyConversionPrompt) return;

    const { fromCurrency, toCurrency } = currencyConversionPrompt;

    if (convert) {
      setFormData((prev) => ({
        ...prev,
        currency: toCurrency,
        rows: prev.rows.map(row => ({
          ...row,
          listPrice: row.listPrice ? convertCurrencyValue(row.listPrice, fromCurrency, toCurrency) : '',
          offerPrice: row.offerPrice ? convertCurrencyValue(row.offerPrice, fromCurrency, toCurrency) : '',
        })),
        additionalHourRate: prev.additionalHourRate
          ? convertCurrencyValue(prev.additionalHourRate, fromCurrency, toCurrency)
          : '',
      }));
      toast.success(`Values converted from ${fromCurrency} to ${toCurrency}`);
    } else {
      updateField('currency', toCurrency);
    }

    setCurrencyConversionPrompt(null);
  }, [currencyConversionPrompt, updateField]);

  // Handle term selection change
  const handleTermChange = useCallback((index: number, value: string) => {
    if (value === 'custom') {
      setCustomTermRows(prev => new Set(prev).add(index));
      updateRow(index, 'term', '');
    } else {
      setCustomTermRows(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      updateRow(index, 'term', value);
    }
  }, [updateRow]);

  // Duplicate quote handler (for QuoteHistory component)
  const handleDuplicateQuote = useCallback((data: QuoteFormData) => {
    const quoteDate = getTodayISO();
    const preparedByEmail = data.preparedByEmail ||
      (data.preparedBy ? ACCOUNT_MANAGERS.find(am => am.name === data.preparedBy)?.email || '' : '');

    setFormData({
      ...data,
      preparedByEmail,
      quoteDate,
      validUntil: getDefaultValidUntil(quoteDate),
    });
    setErrors({});
    setTouched({});
    setCustomTermRows(new Set());
    toast.success('Quote duplicated - dates reset to today');
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
      // Scroll to first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus?.();
        }
      }
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

  // Handle Word download
  const handleGenerateWord = useCallback(async () => {
    // Validate
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched(prev => ({
      ...prev,
      preparedFor: true,
      contactName: true,
      contactEmail: true,
    }));

    if (hasErrors(validationErrors)) {
      toast.error('Please fix the validation errors');
      // Scroll to first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus?.();
        }
      }
      return;
    }

    setIsGenerating(true);

    try {
      const bytes = await generateQuoteWord(formData);
      const filename = generateQuoteWordFilename(formData);

      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveToHistory(formData.contactEmail, formData);
      setHistoryRefresh((prev) => prev + 1);

      toast.success('Word document generated successfully');
    } catch (error) {
      console.error('Word generation failed:', error);
      toast.error('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-neutral-900">
                  myRA AI<sup className="text-[10px] ml-0.5 text-neutral-500">®</sup>
                </h1>
                <p className="text-xs text-neutral-500">Cost Quotation</p>
              </div>
            </div>
            <a
              href="/quote"
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              ← Back to Sales Documents
            </a>
          </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Corporate Quotation</h2>
                    <p className="text-sm text-violet-200">
                      Generate a professional quote for myRA AI® platform
                    </p>
                  </div>
                  {/* Save Indicator */}
                  <div
                    className={`flex items-center gap-1.5 text-xs text-white/90 bg-white/10 px-2.5 py-1 rounded-full transition-opacity duration-300 ${
                      showSaveIndicator ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Draft saved</span>
                  </div>
                </div>
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
                        name="preparedFor"
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
                        name="contactName"
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
                        name="contactEmail"
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
                        onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
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
                      <select
                        value={formData.preparedBy}
                        onChange={(e) => {
                          const selectedAM = ACCOUNT_MANAGERS.find(am => am.name === e.target.value);
                          updateField('preparedBy', e.target.value);
                          updateField('preparedByEmail', selectedAM?.email || '');
                        }}
                        className={getInputClass('preparedBy', false)}
                      >
                        <option value="">Select Account Manager...</option>
                        {ACCOUNT_MANAGERS.map((am) => (
                          <option key={am.name} value={am.name}>
                            {am.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* AM Email (auto-populated, read-only) */}
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">AM Email</label>
                      <input
                        type="email"
                        value={formData.preparedByEmail}
                        readOnly
                        className={`${getInputClass('preparedByEmail', false)} bg-neutral-50 cursor-not-allowed`}
                        placeholder="Select AM to populate"
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
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-medium text-neutral-700">Investment</h3>
                      <label className="flex items-center gap-2 text-sm text-neutral-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showUsersColumn}
                          onChange={(e) => updateField('showUsersColumn', e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                        />
                        Show Users
                      </label>
                    </div>
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

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-violet-600 text-white">
                          <th className="px-3 py-2 text-left font-medium rounded-tl-lg">Term</th>
                          {formData.showUsersColumn && (
                            <th className="px-3 py-2 text-left font-medium">Users</th>
                          )}
                          <th className="px-3 py-2 text-left font-medium">Consulting Hours</th>
                          <th className="px-3 py-2 text-left font-medium">List Price</th>
                          <th className="px-3 py-2 text-left font-medium">Promotional Price/Year</th>
                          <th className="px-3 py-2 text-center font-medium">Discount</th>
                          <th className="px-3 py-2 text-center font-medium rounded-tr-lg w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.rows.map((row, index) => {
                          const discount = calculateDiscountPercent(row.listPrice, row.offerPrice);
                          const showCustomInput = customTermRows.has(index) || (!isStandardTerm(row.term) && row.term !== '');

                          return (
                            <tr
                              key={index}
                              className={index % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}
                            >
                              <td className="px-2 py-2">
                                {showCustomInput ? (
                                  <input
                                    type="text"
                                    value={row.term}
                                    onChange={(e) => updateRow(index, 'term', e.target.value)}
                                    onBlur={() => {
                                      if (!row.term) {
                                        setCustomTermRows(prev => {
                                          const next = new Set(prev);
                                          next.delete(index);
                                          return next;
                                        });
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                    placeholder="Custom term..."
                                    autoFocus
                                  />
                                ) : (
                                  <select
                                    value={isStandardTerm(row.term) ? row.term : 'custom'}
                                    onChange={(e) => handleTermChange(index, e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                  >
                                    <option value="">Select...</option>
                                    {TERM_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              {formData.showUsersColumn && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={row.users}
                                    onChange={(e) => updateRow(index, 'users', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                    placeholder="10"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.consultingHours}
                                  onChange={(e) => updateRow(index, 'consultingHours', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                  placeholder="500/year"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.listPrice}
                                  onChange={(e) => updateRow(index, 'listPrice', parseFormattedNumber(e.target.value))}
                                  onBlur={() => {
                                    if (row.listPrice) {
                                      const formatted = formatNumberDisplay(row.listPrice, formData.currency);
                                      updateRow(index, 'listPrice', formatted);
                                    }
                                  }}
                                  onFocus={() => {
                                    if (row.listPrice) {
                                      updateRow(index, 'listPrice', parseFormattedNumber(row.listPrice));
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                                  placeholder="75,000"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.offerPrice}
                                  onChange={(e) => updateRow(index, 'offerPrice', parseFormattedNumber(e.target.value))}
                                  onBlur={() => {
                                    handleBlur(`row_${index}_offerPrice`);
                                    if (row.offerPrice) {
                                      const formatted = formatNumberDisplay(row.offerPrice, formData.currency);
                                      updateRow(index, 'offerPrice', formatted);
                                    }
                                  }}
                                  onFocus={() => {
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
                                {discount.percent !== null ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    discount.isNegative
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {discount.percent.toFixed(1)}% {discount.isNegative ? 'up' : 'off'}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="md:hidden space-y-4">
                    {formData.rows.map((row, index) => {
                      const discount = calculateDiscountPercent(row.listPrice, row.offerPrice);
                      const showCustomInput = customTermRows.has(index) || (!isStandardTerm(row.term) && row.term !== '');

                      return (
                        <div key={index} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                          {/* Header row with term and delete */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 mr-2">
                              {showCustomInput ? (
                                <input
                                  type="text"
                                  value={row.term}
                                  onChange={(e) => updateRow(index, 'term', e.target.value)}
                                  onBlur={() => {
                                    if (!row.term) {
                                      setCustomTermRows(prev => {
                                        const next = new Set(prev);
                                        next.delete(index);
                                        return next;
                                      });
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
                                  placeholder="Custom term..."
                                />
                              ) : (
                                <select
                                  value={isStandardTerm(row.term) ? row.term : 'custom'}
                                  onChange={(e) => handleTermChange(index, e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500 bg-white"
                                >
                                  <option value="">Select term...</option>
                                  {TERM_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {formData.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRow(index)}
                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Users & Consulting Hours */}
                          <div className={`grid gap-3 mb-3 ${formData.showUsersColumn ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {formData.showUsersColumn && (
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Users</label>
                                <input
                                  type="text"
                                  value={row.users}
                                  onChange={(e) => updateRow(index, 'users', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500 bg-white"
                                  placeholder="10"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-xs text-neutral-500 mb-1">Consulting Hours</label>
                              <input
                                type="text"
                                value={row.consultingHours}
                                onChange={(e) => updateRow(index, 'consultingHours', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500 bg-white"
                                placeholder="500/year"
                              />
                            </div>
                          </div>

                          {/* Prices */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-neutral-500 mb-1">List Price</label>
                              <input
                                type="text"
                                value={row.listPrice}
                                onChange={(e) => updateRow(index, 'listPrice', parseFormattedNumber(e.target.value))}
                                onBlur={() => {
                                  if (row.listPrice) {
                                    const formatted = formatNumberDisplay(row.listPrice, formData.currency);
                                    updateRow(index, 'listPrice', formatted);
                                  }
                                }}
                                onFocus={() => {
                                  if (row.listPrice) {
                                    updateRow(index, 'listPrice', parseFormattedNumber(row.listPrice));
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500 bg-white"
                                placeholder="75,000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-neutral-500 mb-1">Promotional Price/Year</label>
                              <input
                                type="text"
                                value={row.offerPrice}
                                onChange={(e) => updateRow(index, 'offerPrice', parseFormattedNumber(e.target.value))}
                                onBlur={() => {
                                  handleBlur(`row_${index}_offerPrice`);
                                  if (row.offerPrice) {
                                    const formatted = formatNumberDisplay(row.offerPrice, formData.currency);
                                    updateRow(index, 'offerPrice', formatted);
                                  }
                                }}
                                onFocus={() => {
                                  if (row.offerPrice) {
                                    updateRow(index, 'offerPrice', parseFormattedNumber(row.offerPrice));
                                  }
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-violet-500 font-medium bg-white ${
                                  errors.rows?.[index]?.offerPrice
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-neutral-200'
                                }`}
                                placeholder="60,000"
                              />
                            </div>
                          </div>

                          {/* Discount Badge */}
                          {discount.percent !== null && (
                            <div className="flex justify-end">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                discount.isNegative
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {discount.percent.toFixed(1)}% {discount.isNegative ? 'up' : 'off'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Hour Rate */}
                  <div className="mt-4 flex items-center gap-4">
                    <label className="text-sm text-neutral-600 whitespace-nowrap">
                      Additional Hour Rate (optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-500">{CURRENCY_SYMBOLS[formData.currency]}</span>
                      <input
                        type="text"
                        value={formData.additionalHourRate}
                        onChange={(e) => updateField('additionalHourRate', parseFormattedNumber(e.target.value))}
                        onBlur={() => {
                          if (formData.additionalHourRate) {
                            const formatted = formatNumberDisplay(formData.additionalHourRate, formData.currency);
                            updateField('additionalHourRate', formatted);
                          }
                        }}
                        onFocus={() => {
                          if (formData.additionalHourRate) {
                            updateField('additionalHourRate', parseFormattedNumber(formData.additionalHourRate));
                          }
                        }}
                        className="w-28 px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                        placeholder="150"
                      />
                      <span className="text-sm text-neutral-500">/hour</span>
                    </div>
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

                {/* Payment Terms (Collapsible) */}
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPaymentTermsOpen(!paymentTermsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-neutral-700">Payment Terms</h3>
                      <span className="px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">
                        {PAYMENT_FREQUENCY_OPTIONS.find(o => o.value === formData.paymentTerms.frequency)?.label || 'Annual'}
                        {formData.paymentTerms.basis !== 'immediate' && formData.paymentTerms.netTerms && (
                          <>, {NET_TERMS_OPTIONS.find(o => o.value === formData.paymentTerms.netTerms)?.label}</>
                        )}
                      </span>
                    </div>
                    {paymentTermsOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    )}
                  </button>
                  {paymentTermsOpen && (
                    <div className="p-4 space-y-4 bg-white border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">
                        Payment schedule shown in the PDF under Commercial Terms.
                      </p>
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* Payment Frequency */}
                        <div>
                          <label className="block text-sm text-neutral-600 mb-1">Payment Frequency</label>
                          <select
                            value={formData.paymentTerms.frequency}
                            onChange={(e) => updatePaymentTerms('frequency', e.target.value as PaymentFrequency)}
                            className={getInputClass('paymentFrequency', false)}
                          >
                            {PAYMENT_FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payment Basis */}
                        <div>
                          <label className="block text-sm text-neutral-600 mb-1">Payment Due</label>
                          <select
                            value={formData.paymentTerms.basis}
                            onChange={(e) => updatePaymentTerms('basis', e.target.value as PaymentBasis)}
                            className={getInputClass('paymentBasis', false)}
                          >
                            {PAYMENT_BASIS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Net Terms (conditional) */}
                        {formData.paymentTerms.basis !== 'immediate' && (
                          <div>
                            <label className="block text-sm text-neutral-600 mb-1">Net Terms</label>
                            <select
                              value={formData.paymentTerms.netTerms || 'net-60'}
                              onChange={(e) => updatePaymentTerms('netTerms', e.target.value as NetTerms)}
                              className={getInputClass('netTerms', false)}
                            >
                              {NET_TERMS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Preview of billing text */}
                      <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                        <p className="text-xs text-neutral-500 mb-1">Preview in PDF:</p>
                        <p className="text-sm text-neutral-700 font-medium">
                          Billing: {PAYMENT_FREQUENCY_OPTIONS.find(o => o.value === formData.paymentTerms.frequency)?.label}
                          {formData.paymentTerms.basis === 'immediate' ? (
                            ', invoiced upfront'
                          ) : (
                            <>, {NET_TERMS_OPTIONS.find(o => o.value === formData.paymentTerms.netTerms)?.label || 'Net 60'} {formData.paymentTerms.basis === 'invoice' ? 'from invoice date' : 'from MSA execution'}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={handleClearFormClick}
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
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateWord}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      Word
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
              onDuplicateQuote={handleDuplicateQuote}
              refreshTrigger={historyRefresh}
            />

            {/* MSA Generator Link */}
            <a
              href="/quote/msa"
              className="block bg-gradient-to-r from-violet-50 to-violet-100 rounded-xl border border-violet-200 p-4 hover:from-violet-100 hover:to-violet-150 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center group-hover:bg-violet-700 transition-colors">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-violet-800">Create MSA</h3>
                  <p className="text-sm text-violet-600">
                    Generate Master Services Agreement
                  </p>
                </div>
              </div>
            </a>

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

      {/* Currency Conversion Prompt */}
      {currencyConversionPrompt?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Convert Currency?</h3>
                <p className="text-sm text-neutral-500">
                  {currencyConversionPrompt.fromCurrency} → {currencyConversionPrompt.toCurrency}
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              Would you like to convert existing price values from {currencyConversionPrompt.fromCurrency} to {currencyConversionPrompt.toCurrency}?
              This uses approximate exchange rates for estimation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => applyCurrencyConversion(false)}
                className="flex-1 px-4 py-2 text-sm border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Keep Original
              </button>
              <button
                onClick={() => applyCurrencyConversion(true)}
                className="flex-1 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Convert Values
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Form Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Clear Form?</h3>
                <p className="text-sm text-neutral-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to clear all form data? This will reset all fields to their default values.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 text-sm border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearFormConfirm}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
