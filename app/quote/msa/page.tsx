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
  Building2,
  MapPin,
  User,
  Mail,
  Calendar,
  Globe,
  DollarSign,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Settings,
} from 'lucide-react';
import type { MSAFormData, OrderFormRow, MSAValidationErrors, Currency } from '@/lib/msa/types';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';
import { DEFAULT_MSA_FORM, COUNTRIES, JURISDICTION_BY_COUNTRY, MORDOR_SIGNATORY } from '@/lib/msa/constants';
import { ACCOUNT_MANAGERS } from '@/lib/quote/constants';
import { generateMSAPDF, generateMSAFilename } from '@/lib/msa/pdf-generator';
import { saveMSADraft, loadMSADraft, saveToMSAHistory } from '@/lib/msa/storage';
import { isQuoteAuthenticated, setQuoteAuthenticated } from '@/lib/quote/auth';
import { MSAPreviewModal } from '@/components/msa/MSAPreviewModal';
import { MSAHistory } from '@/components/msa/MSAHistory';
import { QuoteAuthModal } from '@/components/quote/QuoteAuthModal';

// Wizard steps
const STEPS = [
  { id: 1, title: 'Client Details', icon: Building2 },
  { id: 2, title: 'Agreement', icon: FileText },
  { id: 3, title: 'Order Form', icon: DollarSign },
  { id: 4, title: 'Review', icon: Eye },
];

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(step: number, data: MSAFormData): MSAValidationErrors {
  const errors: MSAValidationErrors = {};

  if (step === 1) {
    if (!data.clientLegalName.trim()) errors.clientLegalName = 'Legal name is required';
    if (!data.clientAddress.trim()) errors.clientAddress = 'Address is required';
    if (!data.clientCountry.trim()) errors.clientCountry = 'Country is required';
    if (!data.clientContactName.trim()) errors.clientContactName = 'Contact name is required';
    if (!data.clientContactEmail.trim()) {
      errors.clientContactEmail = 'Email is required';
    } else if (!EMAIL_REGEX.test(data.clientContactEmail)) {
      errors.clientContactEmail = 'Please enter a valid email address';
    }
  }

  if (step === 2) {
    if (!data.effectiveDate) errors.effectiveDate = 'Effective date is required';
  }

  return errors;
}

function hasStepErrors(errors: MSAValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Get today's date in ISO format
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Format date for display
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Format number with commas
function formatNumberDisplay(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  if (currency === 'INR') {
    return num.toLocaleString('en-IN');
  }
  return num.toLocaleString('en-US');
}

// Format currency for display
function formatCurrency(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  const symbols: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  if (currency === 'INR') {
    return symbols[currency] + num.toLocaleString('en-IN');
  }
  return symbols[currency] + num.toLocaleString('en-US');
}

// Parse formatted number back to raw value
function parseFormattedNumber(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

export default function MSAPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MSAFormData>(() => {
    return {
      ...DEFAULT_MSA_FORM,
      effectiveDate: getTodayISO(),
      orderFormRows: [...DEFAULT_MSA_FORM.orderFormRows],
    };
  });
  const [errors, setErrors] = useState<MSAValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
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
    const draft = loadMSADraft();
    if (draft) {
      setFormData(draft);
    }
  }, []);

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveMSADraft(formData);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData]);

  // Validate on blur
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validateStep(currentStep, formData));
  }, [formData, currentStep]);

  // Update field helper
  const updateField = useCallback(<K extends keyof MSAFormData>(field: K, value: MSAFormData[K]) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-suggest jurisdiction when country changes
      if (field === 'clientCountry') {
        const country = value as string;
        const suggestedJurisdiction = JURISDICTION_BY_COUNTRY[country] || JURISDICTION_BY_COUNTRY['Default'];
        updated.jurisdiction = suggestedJurisdiction;
      }

      return updated;
    });
  }, []);

  // Update order form row
  const updateOrderFormRow = useCallback((index: number, field: keyof OrderFormRow, value: string) => {
    setFormData(prev => {
      const newRows = [...prev.orderFormRows];
      newRows[index] = { ...newRows[index], [field]: value };
      return { ...prev, orderFormRows: newRows };
    });
  }, []);

  // Add order form row
  const addOrderFormRow = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      orderFormRows: [
        ...prev.orderFormRows,
        { term: '1-Year', users: '', consultingHours: '', listPrice: '', offerPrice: '' },
      ],
    }));
  }, []);

  // Remove order form row
  const removeOrderFormRow = useCallback((index: number) => {
    setFormData(prev => {
      const newRows = prev.orderFormRows.filter((_, i) => i !== index);
      let newSelectedIndex = prev.selectedRowIndex;
      if (prev.selectedRowIndex === index) {
        newSelectedIndex = -1;
      } else if (prev.selectedRowIndex > index) {
        newSelectedIndex = prev.selectedRowIndex - 1;
      }
      return {
        ...prev,
        orderFormRows: newRows.length > 0 ? newRows : [{ term: '1-Year', users: '', consultingHours: '', listPrice: '', offerPrice: '' }],
        selectedRowIndex: newSelectedIndex,
      };
    });
  }, []);

  // Navigation
  const goToNextStep = useCallback(() => {
    const stepErrors = validateStep(currentStep, formData);
    if (hasStepErrors(stepErrors)) {
      setErrors(stepErrors);
      // Mark all fields as touched for current step
      const touchedFields: Record<string, boolean> = {};
      Object.keys(stepErrors).forEach(key => { touchedFields[key] = true; });
      setTouched(prev => ({ ...prev, ...touchedFields }));
      toast.error('Please fix the errors before continuing');
      return;
    }
    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [currentStep, formData]);

  const goToPrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    // Only allow going back or to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  // Generate PDF preview
  const handlePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      const bytes = await generateMSAPDF(formData);
      const filename = generateMSAFilename(formData);
      setPdfBytes(bytes);
      setPdfFilename(filename);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF preview');
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  // Download PDF
  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const bytes = await generateMSAPDF(formData);
      const filename = generateMSAFilename(formData);

      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      saveToMSAHistory(formData.clientContactEmail, formData);
      setHistoryRefresh(prev => prev + 1);

      toast.success('MSA downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  // Download from preview modal
  const handlePreviewDownload = useCallback(() => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      saveToMSAHistory(formData.clientContactEmail, formData);
      setHistoryRefresh(prev => prev + 1);

      toast.success('MSA downloaded successfully');
    }
  }, [pdfBytes, pdfFilename, formData]);

  // Load MSA from history
  const handleLoadMSA = useCallback((data: MSAFormData) => {
    setFormData(data);
    setErrors({});
    setTouched({});
    setCurrentStep(1);
    toast.success('MSA loaded from history');
  }, []);

  // Show auth modal if not authenticated
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <QuoteAuthModal onSuccess={handleAuthSuccess} />;
  }

  const currencySymbol = CURRENCY_SYMBOLS[formData.currency];

  // Input class helper
  const getInputClass = (field: string, hasError: boolean) => {
    const base = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors';
    if (hasError) return `${base} border-red-300 bg-red-50`;
    return `${base} border-neutral-300`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">MSA Generator</h1>
                <p className="text-sm text-neutral-500">Master Services Agreement</p>
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

      {/* Progress Steps */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 ${
                    step.id === currentStep
                      ? 'text-violet-600'
                      : step.id < currentStep
                      ? 'text-green-600 cursor-pointer hover:text-green-700'
                      : 'text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id === currentStep
                      ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-600'
                      : step.id < currentStep
                      ? 'bg-green-100 text-green-600'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step.id < currentStep ? 'bg-green-300' : 'bg-neutral-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              {/* Step 1: Client Details */}
              {currentStep === 1 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-6">
                    <Building2 className="w-5 h-5 text-violet-600" />
                    <h2 className="text-lg font-semibold text-neutral-800">Client Details</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Legal Entity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.clientLegalName}
                      onChange={(e) => updateField('clientLegalName', e.target.value)}
                      onBlur={() => handleBlur('clientLegalName')}
                      className={getInputClass('clientLegalName', !!(touched.clientLegalName && errors.clientLegalName))}
                      placeholder="e.g., Acme Corporation Ltd."
                    />
                    {touched.clientLegalName && errors.clientLegalName && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientLegalName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Registered Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.clientAddress}
                      onChange={(e) => updateField('clientAddress', e.target.value)}
                      onBlur={() => handleBlur('clientAddress')}
                      rows={2}
                      className={getInputClass('clientAddress', !!(touched.clientAddress && errors.clientAddress))}
                      placeholder="Full registered business address"
                    />
                    {touched.clientAddress && errors.clientAddress && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientAddress}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <Globe className="w-3 h-3 inline mr-1" />
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.clientCountry}
                      onChange={(e) => updateField('clientCountry', e.target.value)}
                      onBlur={() => handleBlur('clientCountry')}
                      className={getInputClass('clientCountry', !!(touched.clientCountry && errors.clientCountry))}
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {touched.clientCountry && errors.clientCountry && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientCountry}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        <User className="w-3 h-3 inline mr-1" />
                        Signatory Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.clientContactName}
                        onChange={(e) => updateField('clientContactName', e.target.value)}
                        onBlur={() => handleBlur('clientContactName')}
                        className={getInputClass('clientContactName', !!(touched.clientContactName && errors.clientContactName))}
                        placeholder="Full name"
                      />
                      {touched.clientContactName && errors.clientContactName && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.clientContactName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Title/Designation
                      </label>
                      <input
                        type="text"
                        value={formData.clientContactTitle}
                        onChange={(e) => updateField('clientContactTitle', e.target.value)}
                        className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="e.g., CEO, CFO"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Contact Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.clientContactEmail}
                      onChange={(e) => updateField('clientContactEmail', e.target.value)}
                      onBlur={() => handleBlur('clientContactEmail')}
                      className={getInputClass('clientContactEmail', !!(touched.clientContactEmail && errors.clientContactEmail))}
                      placeholder="email@company.com"
                    />
                    {touched.clientContactEmail && errors.clientContactEmail && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientContactEmail}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Agreement Details */}
              {currentStep === 2 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-violet-600" />
                    <h2 className="text-lg font-semibold text-neutral-800">Agreement Details</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Agreement Version
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">v</span>
                        <input
                          type="number"
                          min="1"
                          value={formData.agreementVersion}
                          onChange={(e) => updateField('agreementVersion', parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Effective Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.effectiveDate}
                        onChange={(e) => updateField('effectiveDate', e.target.value)}
                        onBlur={() => handleBlur('effectiveDate')}
                        className={getInputClass('effectiveDate', !!(touched.effectiveDate && errors.effectiveDate))}
                      />
                      {touched.effectiveDate && errors.effectiveDate && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.effectiveDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Account Manager
                    </label>
                    <select
                      value={formData.preparedBy}
                      onChange={(e) => {
                        const am = ACCOUNT_MANAGERS.find(a => a.name === e.target.value);
                        updateField('preparedBy', e.target.value);
                        updateField('preparedByEmail', am?.email || '');
                      }}
                      className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Select AM...</option>
                      {ACCOUNT_MANAGERS.map((am) => (
                        <option key={am.name} value={am.name}>{am.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Governing Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={formData.jurisdiction}
                      onChange={(e) => updateField('jurisdiction', e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                      placeholder="Auto-suggested based on country"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Auto-suggested based on client country. Edit if needed.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.includeConsultingServices}
                        onChange={(e) => updateField('includeConsultingServices', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                      />
                      <div>
                        <span className="font-medium text-neutral-700">Include Consulting Services Section</span>
                        <p className="text-sm text-neutral-500">
                          Section covers Expert Review and consulting hours allocation
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Order Form */}
              {currentStep === 3 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-violet-600" />
                      <h2 className="text-lg font-semibold text-neutral-800">Order Form</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-neutral-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showUsersColumn}
                          onChange={(e) => updateField('showUsersColumn', e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                        />
                        Show Users
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => updateField('currency', e.target.value as Currency)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Form Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-neutral-500 border-b border-neutral-200">
                          <th className="pb-3 pr-2">Term</th>
                          {formData.showUsersColumn && <th className="pb-3 px-2">Users</th>}
                          <th className="pb-3 px-2">Consulting Hours</th>
                          <th className="pb-3 px-2">List Price</th>
                          <th className="pb-3 px-2">Investment</th>
                          {formData.orderFormRows.length > 1 && <th className="pb-3 px-2">Select</th>}
                          <th className="pb-3 pl-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.orderFormRows.map((row, index) => (
                          <tr key={index} className="border-b border-neutral-100">
                            <td className="py-3 pr-2">
                              <select
                                value={row.term}
                                onChange={(e) => updateOrderFormRow(index, 'term', e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                              >
                                <option value="1-Year">1-Year</option>
                                <option value="2-Year">2-Year</option>
                                <option value="3-Year">3-Year</option>
                                <option value="6-Month">6-Month</option>
                                <option value="3-Month">3-Month</option>
                              </select>
                            </td>
                            {formData.showUsersColumn && (
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={row.users}
                                  onChange={(e) => updateOrderFormRow(index, 'users', e.target.value)}
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                  placeholder="10"
                                />
                              </td>
                            )}
                            <td className="py-3 px-2">
                              <input
                                type="text"
                                value={row.consultingHours}
                                onChange={(e) => updateOrderFormRow(index, 'consultingHours', e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                placeholder="500/year"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="text"
                                  value={row.listPrice}
                                  onChange={(e) => updateOrderFormRow(index, 'listPrice', parseFormattedNumber(e.target.value))}
                                  onBlur={(e) => {
                                    const formatted = formatNumberDisplay(e.target.value, formData.currency);
                                    if (formatted !== e.target.value) {
                                      updateOrderFormRow(index, 'listPrice', formatted);
                                    }
                                  }}
                                  className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                  placeholder="75,000"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="text"
                                  value={row.offerPrice}
                                  onChange={(e) => updateOrderFormRow(index, 'offerPrice', parseFormattedNumber(e.target.value))}
                                  onBlur={(e) => {
                                    const formatted = formatNumberDisplay(e.target.value, formData.currency);
                                    if (formatted !== e.target.value) {
                                      updateOrderFormRow(index, 'offerPrice', formatted);
                                    }
                                  }}
                                  className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-violet-500"
                                  placeholder="60,000"
                                />
                              </div>
                            </td>
                            {formData.orderFormRows.length > 1 && (
                              <td className="py-3 px-2 text-center">
                                <input
                                  type="radio"
                                  name="selectedRow"
                                  checked={formData.selectedRowIndex === index}
                                  onChange={() => updateField('selectedRowIndex', index)}
                                  className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                                  title="Select as winning row"
                                />
                              </td>
                            )}
                            <td className="py-3 pl-2">
                              {formData.orderFormRows.length > 1 && (
                                <button
                                  onClick={() => removeOrderFormRow(index)}
                                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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

                  <button
                    onClick={addOrderFormRow}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>

                  {formData.orderFormRows.length > 1 && formData.selectedRowIndex === -1 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Select a winning row or all rows will be included.
                    </p>
                  )}

                  <div className="pt-4 border-t border-neutral-200">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Additional Hour Rate (optional)
                    </label>
                    <div className="relative w-48">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                        {currencySymbol}
                      </span>
                      <input
                        type="text"
                        value={formData.additionalHourRate}
                        onChange={(e) => updateField('additionalHourRate', e.target.value)}
                        className="w-full pl-8 pr-14 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                        placeholder="250"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                        /hour
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-6">
                    <Eye className="w-5 h-5 text-violet-600" />
                    <h2 className="text-lg font-semibold text-neutral-800">Review & Generate</h2>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Ready to generate your MSA
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      Review the preview on the right and click Generate when ready.
                    </p>
                  </div>

                  {/* Special Terms */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Special Terms (optional)
                    </label>
                    <textarea
                      value={formData.specialTerms}
                      onChange={(e) => updateField('specialTerms', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                      placeholder="Any additional terms or conditions specific to this agreement..."
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      If provided, these will appear as an additional section in the agreement.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handlePreview}
                      disabled={isGenerating}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-violet-600 text-violet-600 hover:bg-violet-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-5 h-5" />
                      Preview PDF
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={isGenerating}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white hover:bg-violet-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Download className="w-5 h-5" />
                      {isGenerating ? 'Generating...' : 'Download MSA'}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                <button
                  onClick={goToPrevStep}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentStep === 1
                      ? 'text-neutral-300 cursor-not-allowed'
                      : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentStep < 4 ? (
                  <button
                    onClick={goToNextStep}
                    className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-lg font-medium transition-colors"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-sm text-neutral-500">
                    Use the buttons above to generate
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {/* Live Preview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                <h3 className="font-semibold text-sm">Live Preview</h3>
              </div>
              <div className="p-4 space-y-4 text-sm">
                {/* Parties Preview */}
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Parties</p>
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                    <div>
                      <span className="text-neutral-500">Provider:</span>
                      <p className="font-medium text-neutral-800">Mordor Intelligence Pvt. Ltd.</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Customer:</span>
                      <p className="font-medium text-neutral-800">
                        {formData.clientLegalName || <span className="text-neutral-400 italic">Enter client name...</span>}
                      </p>
                      {formData.clientAddress && (
                        <p className="text-neutral-600 text-xs mt-0.5">{formData.clientAddress}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agreement Details Preview */}
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Agreement</p>
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Version:</span>
                      <span className="font-medium">v{formData.agreementVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Effective:</span>
                      <span className="font-medium">{formatDate(formData.effectiveDate) || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Jurisdiction:</span>
                      <span className="font-medium text-right text-xs">{formData.jurisdiction || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Investment Preview */}
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Investment</p>
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                    {formData.orderFormRows.map((row, index) => (
                      row.offerPrice && (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-neutral-600">{row.term}</span>
                          <span className="font-semibold text-violet-600">
                            {formatCurrency(row.offerPrice, formData.currency)}
                          </span>
                        </div>
                      )
                    ))}
                    {!formData.orderFormRows.some(r => r.offerPrice) && (
                      <p className="text-neutral-400 italic">Enter pricing...</p>
                    )}
                  </div>
                </div>

                {/* Signatories Preview */}
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Signatories</p>
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                    <div>
                      <span className="text-neutral-500">For Mordor:</span>
                      <p className="font-medium text-neutral-800">{MORDOR_SIGNATORY.name}</p>
                      <p className="text-xs text-neutral-500">{MORDOR_SIGNATORY.title}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">For Customer:</span>
                      <p className="font-medium text-neutral-800">
                        {formData.clientContactName || <span className="text-neutral-400 italic">Enter signatory...</span>}
                      </p>
                      {formData.clientContactTitle && (
                        <p className="text-xs text-neutral-500">{formData.clientContactTitle}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Info */}
                <div className="pt-3 border-t border-neutral-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Document:</span>
                    <span className="text-neutral-600">18 pages</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-neutral-400">Sections:</span>
                    <span className="text-neutral-600">26 + SLA Annexure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <MSAHistory
              email={formData.clientContactEmail}
              onLoadMSA={handleLoadMSA}
              refreshTrigger={historyRefresh}
            />

            {/* Quick Link to Quote */}
            <a
              href="/quote/cost"
              className="block bg-gradient-to-r from-violet-50 to-violet-100 rounded-xl border border-violet-200 p-4 hover:from-violet-100 hover:to-violet-150 transition-colors"
            >
              <h3 className="font-semibold text-violet-800 text-sm mb-1">Need a Quote First?</h3>
              <p className="text-xs text-violet-600">
                Generate a cost quotation before creating the MSA.
              </p>
            </a>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <MSAPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfBytes={pdfBytes}
        filename={pdfFilename}
        onDownload={handlePreviewDownload}
      />
    </div>
  );
}
