'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface TrialOrgRow {
  id: string; // Temporary ID for tracking
  organization_name: string;
  org_domain: string | null;
  stage: string;
  engagement_score: number | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  account_manager_id: string | null;
  account_manager_name: string | null; // For display
  sales_poc_id: string | null;
  sales_poc_name: string | null; // For display
  notes: string | null;
  validation_errors: string[];
}

const STAGES = ['Lead', 'Qualification', 'Trial', 'Negotiation', 'Won', 'Lost'];

export default function TrialOrgsImportPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [accountManagers, setAccountManagers] = useState<User[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mappedData, setMappedData] = useState<TrialOrgRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [importing, setImporting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Check admin access
  useEffect(() => {
    checkAccess();
    fetchUsers();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'Admin') {
      toast.error('Admin access required');
      router.push('/support/dashboard');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/users');
      const data = await response.json();

      if (data.users) {
        const activeUsers = data.users.filter((u: User) => u.status === 'Active');
        setUsers(activeUsers);

        // Filter account managers
        const ams = activeUsers.filter((u: User) =>
          u.role === 'Account Manager'
        );
        setAccountManagers(ams);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  // Column mapping with synonyms
  const mapColumns = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};

    const columnMap: Record<string, string[]> = {
      organization_name: ['organization name', 'org name', 'company', 'organization', 'client name', 'account name'],
      org_domain: ['domain', 'org domain', 'website', 'url', 'company domain'],
      stage: ['stage', 'status', 'phase', 'pipeline stage', 'deal stage'],
      engagement_score: ['engagement score', 'engagement', 'score', 'health score', 'account health'],
      trial_start_date: ['trial start', 'start date', 'trial start date', 'trial started', 'started on'],
      trial_end_date: ['trial end', 'end date', 'trial end date', 'trial ends', 'expires on', 'expiry date'],
      account_manager: ['account manager', 'am', 'account owner', 'owner', 'manager', 'csm'],
      sales_poc: ['sales poc', 'sales', 'sales rep', 'sales contact', 'business development'],
      notes: ['notes', 'comments', 'description', 'remarks', 'additional info'],
    };

    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();

      for (const [targetCol, synonyms] of Object.entries(columnMap)) {
        if (synonyms.some(syn => normalizedHeader.includes(syn))) {
          mapping[header] = targetCol;
          break;
        }
      }
    });

    return mapping;
  };

  // Parse date flexibly
  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    try {
      // If it's already a Date object
      if (dateValue instanceof Date) {
        return format(dateValue, 'yyyy-MM-dd');
      }

      // If it's a string
      if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();

        // Try common formats
        const formats = [
          'yyyy-MM-dd',
          'MM/dd/yyyy',
          'dd/MM/yyyy',
          'M/d/yyyy',
          'd/M/yyyy',
          'yyyy/MM/dd',
          'MMM dd, yyyy',
          'MMMM dd, yyyy',
          'dd-MMM-yyyy',
          'dd MMM yyyy',
        ];

        for (const fmt of formats) {
          try {
            const parsed = parse(trimmed, fmt, new Date());
            if (isValid(parsed)) {
              return format(parsed, 'yyyy-MM-dd');
            }
          } catch (e) {
            continue;
          }
        }
      }

      // If it's an Excel serial date number
      if (typeof dateValue === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(dateValue);
        if (excelDate) {
          const date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          if (isValid(date)) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      }
    } catch (e) {
      console.error('Date parsing error:', e);
    }

    return null;
  };

  // Map user name to user ID (supports "A/B" format)
  const mapUserToId = (userName: string | null, role: 'am' | 'sales'): { id: string | null; name: string | null } => {
    if (!userName || !userName.trim()) return { id: null, name: null };

    const trimmed = userName.trim();

    // Check if it's "A/B" format (A is account manager, B is sales POC)
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/').map(p => p.trim());
      const targetName = role === 'am' ? parts[0] : (parts[1] || parts[0]);

      // Find user by name (fuzzy match)
      const user = users.find(u =>
        u.name.toLowerCase().includes(targetName.toLowerCase()) ||
        targetName.toLowerCase().includes(u.name.toLowerCase()) ||
        u.email.toLowerCase().includes(targetName.toLowerCase())
      );

      return { id: user?.id || null, name: user?.name || targetName };
    }

    // Regular single name lookup
    const user = users.find(u =>
      u.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(u.name.toLowerCase()) ||
      u.email.toLowerCase().includes(trimmed.toLowerCase())
    );

    return { id: user?.id || null, name: user?.name || trimmed };
  };

  // Normalize stage
  const normalizeStage = (stage: string | null): string => {
    if (!stage) return 'Lead';

    const stageMap: Record<string, string> = {
      'lead': 'Lead',
      'new': 'Lead',
      'qualification': 'Qualification',
      'qualified': 'Qualification',
      'trial': 'Trial',
      'active': 'Trial',
      'negotiation': 'Negotiation',
      'proposal': 'Negotiation',
      'won': 'Won',
      'closed': 'Won',
      'closed won': 'Won',
      'lost': 'Lost',
      'closed lost': 'Lost',
    };

    const normalized = stage.toLowerCase().trim();
    return stageMap[normalized] || STAGES.find(s => s.toLowerCase() === normalized) || 'Lead';
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

        setRawData(jsonData);
        processData(jsonData);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Failed to read file. Please check format.');
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // Process and map data
  const processData = (data: any[]) => {
    if (data.length === 0) {
      toast.error('File is empty');
      return;
    }

    const headers = Object.keys(data[0]);
    const columnMapping = mapColumns(headers);

    console.log('📋 Column Mapping:', columnMapping);

    const mapped: TrialOrgRow[] = data.map((row, index) => {
      const org: TrialOrgRow = {
        id: `temp-${index}`,
        organization_name: '',
        org_domain: null,
        stage: 'Lead',
        engagement_score: null,
        trial_start_date: null,
        trial_end_date: null,
        account_manager_id: null,
        account_manager_name: null,
        sales_poc_id: null,
        sales_poc_name: null,
        notes: null,
        validation_errors: [],
      };

      // Map each column
      for (const [header, value] of Object.entries(row)) {
        const targetCol = columnMapping[header];

        if (!targetCol) continue;

        switch (targetCol) {
          case 'organization_name':
            org.organization_name = value ? String(value).trim() : '';
            break;
          case 'org_domain':
            org.org_domain = value ? String(value).trim() : null;
            break;
          case 'stage':
            org.stage = normalizeStage(value ? String(value) : null);
            break;
          case 'engagement_score':
            const score = value ? parseFloat(String(value)) : null;
            org.engagement_score = (score !== null && !isNaN(score)) ? Math.max(0, Math.min(100, score)) : null;
            break;
          case 'trial_start_date':
            org.trial_start_date = parseDate(value);
            break;
          case 'trial_end_date':
            org.trial_end_date = parseDate(value);
            break;
          case 'account_manager':
            const am = mapUserToId(value ? String(value) : null, 'am');
            org.account_manager_id = am.id;
            org.account_manager_name = am.name;
            break;
          case 'sales_poc':
            const sales = mapUserToId(value ? String(value) : null, 'sales');
            org.sales_poc_id = sales.id;
            org.sales_poc_name = sales.name;
            break;
          case 'notes':
            org.notes = value ? String(value).trim() : null;
            break;
        }
      }

      // Validation
      if (!org.organization_name) {
        org.validation_errors.push('Organization name is required');
      }

      if (org.account_manager_name && !org.account_manager_id) {
        org.validation_errors.push(`Account Manager "${org.account_manager_name}" not found in users`);
      }

      if (org.sales_poc_name && !org.sales_poc_id) {
        org.validation_errors.push(`Sales POC "${org.sales_poc_name}" not found in users`);
      }

      return org;
    });

    setMappedData(mapped);
    setStep('preview');

    const errorCount = mapped.filter(m => m.validation_errors.length > 0).length;
    if (errorCount > 0) {
      toast.error(`${errorCount} rows have validation errors. Please review.`, { duration: 5000 });
    } else {
      toast.success(`Mapped ${mapped.length} organizations successfully!`);
    }
  };

  // Inline editing
  const handleStartEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = (id: string, field: string) => {
    setMappedData(prev => prev.map(org => {
      if (org.id !== id) return org;

      const updated = { ...org };

      switch (field) {
        case 'organization_name':
          updated.organization_name = editValue.trim();
          break;
        case 'org_domain':
          updated.org_domain = editValue.trim() || null;
          break;
        case 'stage':
          updated.stage = editValue;
          break;
        case 'engagement_score':
          const score = parseFloat(editValue);
          updated.engagement_score = !isNaN(score) ? Math.max(0, Math.min(100, score)) : null;
          break;
        case 'trial_start_date':
        case 'trial_end_date':
          updated[field] = parseDate(editValue);
          break;
        case 'account_manager':
          const am = mapUserToId(editValue, 'am');
          updated.account_manager_id = am.id;
          updated.account_manager_name = am.name;
          break;
        case 'sales_poc':
          const sales = mapUserToId(editValue, 'sales');
          updated.sales_poc_id = sales.id;
          updated.sales_poc_name = sales.name;
          break;
        case 'notes':
          updated.notes = editValue.trim() || null;
          break;
      }

      // Re-validate
      updated.validation_errors = [];
      if (!updated.organization_name) {
        updated.validation_errors.push('Organization name is required');
      }
      if (updated.account_manager_name && !updated.account_manager_id) {
        updated.validation_errors.push(`Account Manager "${updated.account_manager_name}" not found`);
      }
      if (updated.sales_poc_name && !updated.sales_poc_id) {
        updated.validation_errors.push(`Sales POC "${updated.sales_poc_name}" not found`);
      }

      return updated;
    }));

    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Execute import (atomic delete + replace)
  const executeImport = async () => {
    const hasErrors = mappedData.some(org => org.validation_errors.length > 0);
    if (hasErrors) {
      toast.error('Please fix all validation errors before importing');
      return;
    }

    if (!window.confirm(
      `⚠️ CRITICAL OPERATION ⚠️\n\n` +
      `This will:\n` +
      `1. DELETE all ${mappedData.length} existing trial organizations\n` +
      `2. IMPORT ${mappedData.length} new organizations\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you absolutely sure?`
    )) {
      return;
    }

    setImporting(true);

    try {
      // Step 1: Delete all existing trial orgs
      console.log('🗑️ Deleting all existing trial organizations...');
      const { error: deleteError } = await supabase
        .from('trial_organizations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`Failed to delete existing data: ${deleteError.message}`);
      }

      console.log('✅ All existing trial organizations deleted');

      // Step 2: Prepare insert data
      const insertData = mappedData.map(org => ({
        organization_name: org.organization_name,
        org_domain: org.org_domain,
        stage: org.stage,
        engagement_score: org.engagement_score,
        trial_start_date: org.trial_start_date,
        trial_end_date: org.trial_end_date,
        account_manager_id: org.account_manager_id,
        sales_poc_id: org.sales_poc_id,
        notes: org.notes,
      }));

      console.log('📥 Inserting', insertData.length, 'new trial organizations...');

      // Step 3: Batch insert (Supabase handles up to 1000 rows)
      const { data: inserted, error: insertError } = await supabase
        .from('trial_organizations')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to insert new data: ${insertError.message}`);
      }

      console.log('✅ Successfully imported', inserted?.length || 0, 'trial organizations');

      toast.success(`🎉 Import complete! ${inserted?.length || 0} organizations imported.`, { duration: 5000 });

      // Redirect to trials page
      setTimeout(() => {
        router.push('/support/trials');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Import failed:', error);
      toast.error(`Import failed: ${error.message}`, { duration: 10000 });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-neutral-600">Loading...</div>
      </div>
    );
  }

  const errorCount = mappedData.filter(org => org.validation_errors.length > 0).length;
  const validCount = mappedData.length - errorCount;

  return (
    <div className="max-w-[95vw] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          🔄 Trial Organizations Import
        </h1>
        <p className="text-sm text-neutral-600">
          Safe atomic replace: Delete all → Import new data with validation & editing
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600 font-semibold' : 'text-neutral-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-neutral-200'}`}>
            1
          </div>
          <span>Upload File</span>
        </div>
        <div className="flex-1 h-0.5 bg-neutral-200"></div>
        <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600 font-semibold' : 'text-neutral-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-neutral-200'}`}>
            2
          </div>
          <span>Preview & Edit</span>
        </div>
        <div className="flex-1 h-0.5 bg-neutral-200"></div>
        <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-blue-600 font-semibold' : 'text-neutral-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-neutral-200'}`}>
            3
          </div>
          <span>Confirm & Import</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Upload Excel/CSV File</h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Supported Columns:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Organization Name (required)</li>
                <li>• Domain / Website</li>
                <li>• Stage / Status</li>
                <li>• Engagement Score (0-100)</li>
                <li>• Trial Start Date</li>
                <li>• Trial End Date</li>
                <li>• Account Manager (supports "A/B" format)</li>
                <li>• Sales POC</li>
                <li>• Notes</li>
              </ul>
            </div>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Important:</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• All existing trial organizations will be deleted</li>
                <li>• Make sure all users are added before importing</li>
                <li>• Date formats: YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY</li>
                <li>• Account Manager "A/B" format: A = AM, B = Sales POC</li>
              </ul>
            </div>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
            />

            {file && (
              <div className="mt-4 text-sm text-neutral-600">
                Selected: <span className="font-semibold">{file.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preview & Edit */}
      {step === 'preview' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-2xl font-bold text-neutral-900">{mappedData.length}</div>
              <div className="text-sm text-neutral-600">Total Organizations</div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-neutral-600">Valid Rows</div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-neutral-600">Rows with Errors</div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden mb-6">
            <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
              <table className="w-full text-xs">
                <thead className="bg-neutral-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">#</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Org Name</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Domain</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Stage</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Score</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Trial Start</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Trial End</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Account Manager</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Sales POC</th>
                    <th className="px-3 py-2 text-left text-neutral-700 font-semibold border-b">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedData.map((org, index) => (
                    <tr
                      key={org.id}
                      className={`border-b hover:bg-neutral-50 ${org.validation_errors.length > 0 ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-3 py-2 text-neutral-600">{index + 1}</td>

                      {/* Organization Name */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'organization_name' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'organization_name')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(org.id, 'organization_name');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'organization_name', org.organization_name)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.organization_name || '-'}
                          </button>
                        )}
                      </td>

                      {/* Domain */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'org_domain' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'org_domain')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(org.id, 'org_domain');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'org_domain', org.org_domain)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.org_domain || '-'}
                          </button>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'stage' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'stage')}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'stage', org.stage)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.stage}
                          </button>
                        )}
                      </td>

                      {/* Engagement Score */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'engagement_score' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'engagement_score')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(org.id, 'engagement_score');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'engagement_score', org.engagement_score)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.engagement_score !== null ? org.engagement_score : '-'}
                          </button>
                        )}
                      </td>

                      {/* Trial Start Date */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'trial_start_date' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'trial_start_date')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(org.id, 'trial_start_date');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'trial_start_date', org.trial_start_date)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.trial_start_date || '-'}
                          </button>
                        )}
                      </td>

                      {/* Trial End Date */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'trial_end_date' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(org.id, 'trial_end_date')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(org.id, 'trial_end_date');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'trial_end_date', org.trial_end_date)}
                            className="w-full text-left hover:text-blue-600"
                          >
                            {org.trial_end_date || '-'}
                          </button>
                        )}
                      </td>

                      {/* Account Manager */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'account_manager' ? (
                          <select
                            value={org.account_manager_id || ''}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setEditValue(user?.name || '');
                            }}
                            onBlur={() => handleSaveEdit(org.id, 'account_manager')}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'account_manager', org.account_manager_name)}
                            className={`w-full text-left hover:text-blue-600 ${!org.account_manager_id && org.account_manager_name ? 'text-red-600' : ''}`}
                          >
                            {org.account_manager_name || '-'}
                          </button>
                        )}
                      </td>

                      {/* Sales POC */}
                      <td className="px-3 py-2">
                        {editingCell?.id === org.id && editingCell?.field === 'sales_poc' ? (
                          <select
                            value={org.sales_poc_id || ''}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setEditValue(user?.name || '');
                            }}
                            onBlur={() => handleSaveEdit(org.id, 'sales_poc')}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(org.id, 'sales_poc', org.sales_poc_name)}
                            className={`w-full text-left hover:text-blue-600 ${!org.sales_poc_id && org.sales_poc_name ? 'text-red-600' : ''}`}
                          >
                            {org.sales_poc_name || '-'}
                          </button>
                        )}
                      </td>

                      {/* Errors */}
                      <td className="px-3 py-2">
                        {org.validation_errors.length > 0 && (
                          <div className="text-red-600 text-xs">
                            {org.validation_errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setStep('upload');
                setMappedData([]);
                setFile(null);
              }}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-900"
            >
              ← Back
            </button>

            <button
              onClick={executeImport}
              disabled={errorCount > 0 || importing}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `🔄 Delete All & Import ${validCount} Orgs`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
