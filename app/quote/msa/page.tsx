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
  RotateCcw,
  Building2,
  MapPin,
  User,
  Mail,
  Calendar,
  Globe,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import type { MSAFormData, OrderFormRow, MSAValidationErrors, Currency } from '@/lib/msa/types';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';
import { DEFAULT_MSA_FORM, COUNTRIES, JURISDICTION_BY_COUNTRY } from '@/lib/msa/constants';
import { ACCOUNT_MANAGERS } from '@/lib/quote/constants';
import { generateMSAPDF, generateMSAFilename } from '@/lib/msa/pdf-generator';
import { saveMSADraft, loadMSADraft, saveToMSAHistory } from '@/lib/msa/storage';
import { isQuoteAuthenticated, setQuoteAuthenticated } from '@/lib/quote/auth';
import { MSAPreviewModal } from '@/components/msa/MSAPreviewModal';
import { MSAHistory } from '@/components/msa/MSAHistory';
import { QuoteAuthModal } from '@/components/quote/QuoteAuthModal';

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data: MSAFormData): MSAValidationErrors {
  const errors: MSAValidationErrors = {};

  if (!data.clientLegalName.trim()) {
    errors.clientLegalName = 'Legal name is required';
  }

  if (!data.clientAddress.trim()) {
    errors.clientAddress = 'Address is required';
  }

  if (!data.clientCountry.trim()) {
    errors.clientCountry = 'Country is required';
  }

  if (!data.clientContactName.trim()) {
    errors.clientContactName = 'Contact name is required';
  }

  if (!data.clientContactEmail.trim()) {
    errors.clientContactEmail = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.clientContactEmail)) {
    errors.clientContactEmail = 'Please enter a valid email address';
  }

  if (!data.effectiveDate) {
    errors.effectiveDate = 'Effective date is required';
  }

  return errors;
}

function hasErrors(errors: MSAValidationErrors): boolean {
  return !!(
    errors.clientLegalName ||
    errors.clientAddress ||
    errors.clientCountry ||
    errors.clientContactName ||
    errors.clientContactEmail ||
    errors.effectiveDate
  );
}

// Get today's date in ISO format
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
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

// Parse formatted number back to raw value
function parseFormattedNumber(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

export default function MSAPage() {
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
    setErrors(validateForm(formData));
  }, [formData]);

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
      // Reset selected row if it was removed
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

  // Clear form
  const clearForm = useCallback(() => {
    if (confirm('Clear all form data?')) {
      setFormData({
        ...DEFAULT_MSA_FORM,
        effectiveDate: getTodayISO(),
        orderFormRows: [...DEFAULT_MSA_FORM.orderFormRows],
      });
      setErrors({});
      setTouched({});
      toast.success('Form cleared');
    }
  }, []);

  // Generate PDF preview
  const handlePreview = useCallback(async () => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched({
      clientLegalName: true,
      clientAddress: true,
      clientCountry: true,
      clientContactName: true,
      clientContactEmail: true,
      effectiveDate: true,
    });

    if (hasErrors(validationErrors)) {
      toast.error('Please fix the errors before previewing');
      return;
    }

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
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched({
      clientLegalName: true,
      clientAddress: true,
      clientCountry: true,
      clientContactName: true,
      clientContactEmail: true,
      effectiveDate: true,
    });

    if (hasErrors(validationErrors)) {
      toast.error('Please fix the errors before downloading');
      return;
    }

    setIsGenerating(true);
    try {
      const bytes = await generateMSAPDF(formData);
      const filename = generateMSAFilename(formData);

      // Create download link
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Save to history
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

      // Save to history
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-violet-600" />
                  Client Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Legal Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Legal Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientLegalName}
                    onChange={(e) => updateField('clientLegalName', e.target.value)}
                    onBlur={() => handleBlur('clientLegalName')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                      touched.clientLegalName && errors.clientLegalName
                        ? 'border-red-300 bg-red-50'
                        : 'border-neutral-300'
                    }`}
                    placeholder="e.g., Acme Corporation Ltd."
                  />
                  {touched.clientLegalName && errors.clientLegalName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.clientLegalName}
                    </p>
                  )}
                </div>

                {/* Address */}
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                      touched.clientAddress && errors.clientAddress
                        ? 'border-red-300 bg-red-50'
                        : 'border-neutral-300'
                    }`}
                    placeholder="Full registered business address"
                  />
                  {touched.clientAddress && errors.clientAddress && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.clientAddress}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Globe className="w-3 h-3 inline mr-1" />
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clientCountry}
                    onChange={(e) => updateField('clientCountry', e.target.value)}
                    onBlur={() => handleBlur('clientCountry')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                      touched.clientCountry && errors.clientCountry
                        ? 'border-red-300 bg-red-50'
                        : 'border-neutral-300'
                    }`}
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
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
                  {/* Contact Name */}
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        touched.clientContactName && errors.clientContactName
                          ? 'border-red-300 bg-red-50'
                          : 'border-neutral-300'
                      }`}
                      placeholder="Full name"
                    />
                    {touched.clientContactName && errors.clientContactName && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.clientContactName}
                      </p>
                    )}
                  </div>

                  {/* Contact Title */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Title/Designation
                    </label>
                    <input
                      type="text"
                      value={formData.clientContactTitle}
                      onChange={(e) => updateField('clientContactTitle', e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., CEO, CFO"
                    />
                  </div>
                </div>

                {/* Contact Email */}
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                      touched.clientContactEmail && errors.clientContactEmail
                        ? 'border-red-300 bg-red-50'
                        : 'border-neutral-300'
                    }`}
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
            </section>

            {/* Agreement Details */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600" />
                  Agreement Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Version */}
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
                        className="w-20 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Effective Date */}
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        touched.effectiveDate && errors.effectiveDate
                          ? 'border-red-300 bg-red-50'
                          : 'border-neutral-300'
                      }`}
                    />
                    {touched.effectiveDate && errors.effectiveDate && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.effectiveDate}
                      </p>
                    )}
                  </div>

                  {/* Prepared By */}
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
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">Select AM...</option>
                      {ACCOUNT_MANAGERS.map((am) => (
                        <option key={am.name} value={am.name}>
                          {am.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Jurisdiction */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Governing Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={formData.jurisdiction}
                    onChange={(e) => updateField('jurisdiction', e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Auto-suggested based on country"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Auto-suggested based on client country. Edit if needed.
                  </p>
                </div>
              </div>
            </section>

            {/* Order Form */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-violet-600" />
                    Order Form
                  </h2>
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
              </div>
              <div className="p-6">
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
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
                              placeholder="500/yr"
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
                                onChange={(e) => updateOrderFormRow(index, 'listPrice', e.target.value)}
                                onBlur={(e) => {
                                  const formatted = formatNumberDisplay(e.target.value, formData.currency);
                                  if (formatted !== e.target.value) {
                                    updateOrderFormRow(index, 'listPrice', formatted);
                                  }
                                }}
                                onFocus={(e) => {
                                  const raw = parseFormattedNumber(e.target.value);
                                  if (raw !== e.target.value) {
                                    updateOrderFormRow(index, 'listPrice', raw);
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
                                onChange={(e) => updateOrderFormRow(index, 'offerPrice', e.target.value)}
                                onBlur={(e) => {
                                  const formatted = formatNumberDisplay(e.target.value, formData.currency);
                                  if (formatted !== e.target.value) {
                                    updateOrderFormRow(index, 'offerPrice', formatted);
                                  }
                                }}
                                onFocus={(e) => {
                                  const raw = parseFormattedNumber(e.target.value);
                                  if (raw !== e.target.value) {
                                    updateOrderFormRow(index, 'offerPrice', raw);
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

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-4">
                  {formData.orderFormRows.map((row, index) => (
                    <div key={index} className="p-4 border border-neutral-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-700">Row {index + 1}</span>
                        {formData.orderFormRows.length > 1 && (
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs text-neutral-500">
                              <input
                                type="radio"
                                name="selectedRowMobile"
                                checked={formData.selectedRowIndex === index}
                                onChange={() => updateField('selectedRowIndex', index)}
                                className="w-3 h-3 text-violet-600"
                              />
                              Winner
                            </label>
                            <button
                              onClick={() => removeOrderFormRow(index)}
                              className="p-1 text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={`grid gap-3 ${formData.showUsersColumn ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        <div>
                          <label className="text-xs text-neutral-500">Term</label>
                          <select
                            value={row.term}
                            onChange={(e) => updateOrderFormRow(index, 'term', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                          >
                            <option value="1-Year">1-Year</option>
                            <option value="2-Year">2-Year</option>
                            <option value="3-Year">3-Year</option>
                          </select>
                        </div>
                        {formData.showUsersColumn && (
                          <div>
                            <label className="text-xs text-neutral-500">Users</label>
                            <input
                              type="text"
                              value={row.users}
                              onChange={(e) => updateOrderFormRow(index, 'users', e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                              placeholder="10"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-neutral-500">Consulting Hours</label>
                          <input
                            type="text"
                            value={row.consultingHours}
                            onChange={(e) => updateOrderFormRow(index, 'consultingHours', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            placeholder="500/yr"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500">Investment ({currencySymbol})</label>
                          <input
                            type="text"
                            value={row.offerPrice}
                            onChange={(e) => updateOrderFormRow(index, 'offerPrice', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium"
                            placeholder="60,000"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addOrderFormRow}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>

                {formData.orderFormRows.length > 1 && formData.selectedRowIndex === -1 && (
                  <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Select a winning row or all rows will be included in the MSA.
                  </p>
                )}

                {/* Additional Hour Rate */}
                <div className="mt-4 pt-4 border-t border-neutral-200">
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
                      className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                      placeholder="250"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                      /hour
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Options */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <h2 className="font-semibold text-neutral-800">Options</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Include Consulting Services */}
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
                      Section 5 covers Expert Review and consulting hours allocation
                    </p>
                  </div>
                </label>

                {/* Special Terms */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Special Terms (optional)
                  </label>
                  <textarea
                    value={formData.specialTerms}
                    onChange={(e) => updateField('specialTerms', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Any additional terms or conditions specific to this agreement..."
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    If provided, these will appear as Section 14 in the agreement.
                  </p>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={clearForm}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Form
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreview}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 border border-violet-600 text-violet-600 hover:bg-violet-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white hover:bg-violet-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isGenerating ? 'Generating...' : 'Download MSA'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* History */}
            <MSAHistory
              email={formData.clientContactEmail}
              onLoadMSA={handleLoadMSA}
              refreshTrigger={historyRefresh}
            />

            {/* Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="font-semibold text-neutral-800 mb-3">About MSA Generator</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-0.5">•</span>
                  Generates legally-formatted Master Services Agreement
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-0.5">•</span>
                  Order Form embedded based on your selection
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-0.5">•</span>
                  Jurisdiction auto-suggested based on client country
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 mt-0.5">•</span>
                  Mordor signatory: {formData.preparedBy || 'Bharadwaj Obula Reddy, CEO'}
                </li>
              </ul>
            </div>

            {/* Quick Link to Quote */}
            <a
              href="/quote/cost"
              className="block bg-gradient-to-r from-violet-50 to-violet-100 rounded-xl border border-violet-200 p-6 hover:from-violet-100 hover:to-violet-150 transition-colors"
            >
              <h3 className="font-semibold text-violet-800 mb-1">Need a Quote First?</h3>
              <p className="text-sm text-violet-600">
                Generate a corporate quotation before creating the MSA.
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
