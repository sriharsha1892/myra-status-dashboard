'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Sparkles,
  Trash2,
  Plus,
  Save,
} from 'lucide-react';

type RoadmapRow = {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'suggested';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source_type: 'admin' | 'feature_request' | 'account_manager';
  owner?: string;
  due_date?: string;
  version?: string;
  category?: string;
  notes?: string;
  proposer?: string;
  goal?: string;
  area?: string;
  rationale?: string;
  version_planned?: string;
  assigned_to?: string;
  _validationErrors?: string[];
  _isValid?: boolean;
};

const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled', 'suggested'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const SOURCE_TYPES = ['admin', 'feature_request', 'account_manager'] as const;

export default function RoadmapImportPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<RoadmapRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);

  const supabase = createClient();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || role?.toLowerCase() !== 'admin') {
    router.push('/support/dashboard');
    return null;
  }

  // Intelligent column mapping
  const mapColumnToField = (columnName: string): string | null => {
    const normalized = columnName.toLowerCase().trim();

    const mappings: { [key: string]: string[] } = {
      title: ['title', 'name', 'feature', 'feature name', 'item', 'feature title'],
      description: ['description', 'desc', 'details', 'summary', 'feature description'],
      status: ['status', 'state', 'stage', 'phase'],
      priority: ['priority', 'importance', 'urgency', 'prio'],
      category: ['category', 'cat', 'type', 'feature type'],
      owner: ['owner', 'assigned to', 'responsible', 'developer', 'lead'],
      due_date: ['due date', 'deadline', 'target date', 'eta', 'release date', 'date'],
      version: ['version', 'release', 'sprint', 'milestone'],
      goal: ['goal', 'objective', 'purpose', 'why'],
      area: ['area', 'domain', 'module', 'component', 'feature area'],
      rationale: ['rationale', 'reason', 'justification', 'business case'],
      proposer: ['proposer', 'proposed by', 'requested by', 'requester'],
      version_planned: ['version planned', 'planned version', 'target version'],
      assigned_to: ['assigned to', 'assignee', 'developer', 'owner'],
      notes: ['notes', 'comments', 'remarks', 'additional info'],
    };

    for (const [field, synonyms] of Object.entries(mappings)) {
      if (synonyms.some(syn => normalized.includes(syn) || syn.includes(normalized))) {
        return field;
      }
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processUploadedData(results.data as any[]);
        },
        error: (error) => {
          toast.error(`CSV parsing error: ${error.message}`);
        },
      });
    } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          processUploadedData(jsonData as any[]);
        } catch (error: any) {
          toast.error(`Excel parsing error: ${error.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Please upload a CSV or Excel file');
    }
  };

  const processUploadedData = (data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('No data found in file');
      return;
    }

    // Map columns intelligently
    const mapped: RoadmapRow[] = data.map((row, index) => {
      const mappedRow: any = {
        id: `temp-${index}`,
        title: '',
        status: 'planned',
        priority: 'medium',
        source_type: 'admin',
      };

      Object.keys(row).forEach((key) => {
        const mappedField = mapColumnToField(key);
        if (mappedField) {
          let value = row[key];

          // Normalize status
          if (mappedField === 'status') {
            const normalized = value?.toString().toLowerCase().trim();

            // Map common variations
            const statusMap: { [key: string]: string } = {
              'done': 'completed',
              'complete': 'completed',
              'finished': 'completed',
              'closed': 'completed',
              'in progress': 'in_progress',
              'in-progress': 'in_progress',
              'active': 'in_progress',
              'working': 'in_progress',
              'todo': 'planned',
              'backlog': 'planned',
              'new': 'planned',
              'canceled': 'cancelled',
              'suggested': 'suggested',
              'idea': 'suggested',
            };

            value = statusMap[normalized] || normalized.replace(/[_\s-]/g, '_');

            // Fallback if still not valid
            if (!STATUSES.includes(value as any)) {
              value = 'planned';
            }
          }

          // Normalize priority
          if (mappedField === 'priority') {
            const normalized = value?.toString().toLowerCase();
            if (PRIORITIES.includes(normalized as any)) {
              value = normalized;
            } else {
              value = 'medium';
            }
          }

          mappedRow[mappedField] = value || '';
        }
      });

      // Validate
      const errors: string[] = [];
      if (!mappedRow.title || mappedRow.title.trim() === '') {
        errors.push('Title is required');
      }

      mappedRow._validationErrors = errors;
      mappedRow._isValid = errors.length === 0;

      return mappedRow;
    });

    setParsedData(mapped);
    setStep('preview');

    const validCount = mapped.filter(r => r._isValid).length;
    toast.success(
      <div>
        <div className="font-semibold">File parsed successfully!</div>
        <div className="text-xs mt-1">
          {validCount}/{mapped.length} rows valid. Review and edit before importing.
        </div>
      </div>,
      { duration: 4000 }
    );
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    setParsedData(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [field]: value,
      };

      // Revalidate
      const errors: string[] = [];
      if (!updated[rowIndex].title || updated[rowIndex].title.trim() === '') {
        errors.push('Title is required');
      }
      updated[rowIndex]._validationErrors = errors;
      updated[rowIndex]._isValid = errors.length === 0;

      return updated;
    });
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r._isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setStep('importing');
    setImporting(true);
    setImportResults({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));

      try {
        const { data: existingItem } = await supabase
          .from('org_product_roadmap')
          .select('id')
          .eq('title', row.title)
          .maybeSingle();

        const itemData = {
          title: row.title,
          description: row.description || null,
          status: row.status,
          priority: row.priority,
          source_type: row.source_type || 'admin',
          owner: row.owner || null,
          due_date: row.due_date || null,
          version: row.version || null,
          category: row.category || null,
          notes: row.notes || null,
          proposer: row.proposer || null,
          goal: row.goal || null,
          area: row.area || null,
          rationale: row.rationale || null,
          version_planned: row.version_planned || null,
          assigned_to: row.assigned_to || null,
          created_by: user.email,
        };

        if (existingItem) {
          // Update existing
          const { error } = await supabase
            .from('org_product_roadmap')
            .update({ ...itemData, updated_at: new Date().toISOString() })
            .eq('id', existingItem.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('org_product_roadmap')
            .insert(itemData);

          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        console.error('Import error for row:', row.title, error);
        console.error('Full error details:', error.message, error.details, error.hint);
        failedCount++;

        // Show detailed error for first failure
        if (failedCount === 1) {
          toast.error(
            <div>
              <div className="font-semibold">Import error on "{row.title}"</div>
              <div className="text-xs mt-1">{error.message || error.toString()}</div>
            </div>,
            { duration: 8000 }
          );
        }
      }
    }

    setImportResults({ success: successCount, failed: failedCount });
    setImporting(false);
    setStep('complete');

    toast.success(
      <div>
        <div className="font-semibold">Import complete!</div>
        <div className="text-xs mt-1">
          {successCount} succeeded, {failedCount} failed
        </div>
      </div>,
      { duration: 5000 }
    );
  };

  const downloadTemplate = () => {
    const template = [
      {
        title: 'Example Feature',
        description: 'Detailed description of the feature',
        status: 'planned',  // Options: planned, in_progress, completed, cancelled, suggested (or use: Done, Planned, In Progress, etc.)
        priority: 'medium',  // Options: low, medium, high, critical
        category: 'UI/UX',
        goal: 'Improve user experience',
        area: 'Dashboard',
        rationale: 'User feedback from trials',
        proposer: 'Account Manager',
        version_planned: 'v2.1',
        assigned_to: 'Dev Team',
        due_date: '2025-12-31',
        notes: 'Additional notes',
      },
      {
        title: 'Another Feature Example',
        description: 'Second example showing Done status',
        status: 'Done',  // Will be converted to 'completed'
        priority: 'High',  // Will be converted to 'high'
        category: 'Backend',
        goal: 'Performance',
        area: 'API',
        rationale: 'System optimization',
        proposer: 'Dev Team',
        version_planned: 'v2.0',
        assigned_to: 'Backend Team',
        due_date: '2025-06-30',
        notes: 'Shows alternative status/priority formats',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roadmap Template');
    XLSX.writeFile(wb, 'roadmap_import_template.xlsx');

    toast.success('Template downloaded!');
  };

  // Upload View
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/support/admin/roadmap')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmap
          </button>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Import Roadmap Items</h1>
              <p className="text-sm text-slate-600">
                Upload your roadmap data from CSV or Excel. We'll intelligently map columns and let you edit before importing.
              </p>
            </div>

            {/* Download Template */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">New to importing?</h3>
                  <p className="text-xs text-blue-700 mb-3">
                    Download our template to see the correct format and column names.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-200"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <FileSpreadsheet className="w-16 h-16 text-slate-400" />
                <div>
                  <p className="text-base font-semibold text-slate-900 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-slate-600">
                    CSV, XLSX, or XLS files supported
                  </p>
                </div>
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl">
                  Choose File
                </div>
              </label>
            </div>

            {/* Supported Columns */}
            <div className="mt-8 p-6 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Supported Columns</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Title (required)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Description</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Category</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Goal</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Proposer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-slate-700">Due Date</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Don't worry about exact column names - our AI will intelligently map them!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview & Edit View
  if (step === 'preview') {
    const validCount = parsedData.filter(r => r._isValid).length;
    const invalidCount = parsedData.length - validCount;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Preview & Edit Data</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {validCount} valid, {invalidCount} invalid • Click cells to edit
                </p>
              </div>
            </div>
            <button
              onClick={handleImport}
              disabled={validCount === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Import {validCount} Items
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100 z-10">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Goal</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {parsedData.map((row, rowIndex) => (
                    <tr key={row.id} className={`hover:bg-slate-50 ${!row._isValid ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        {row._isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-xs text-red-600">{row._validationErrors?.[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => handleCellEdit(rowIndex, 'title', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                          placeholder="Required"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.description || ''}
                          onChange={(e) => handleCellEdit(rowIndex, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.status}
                          onChange={(e) => handleCellEdit(rowIndex, 'status', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500 text-xs"
                        >
                          {STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.priority}
                          onChange={(e) => handleCellEdit(rowIndex, 'priority', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500 text-xs"
                        >
                          {PRIORITIES.map(priority => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.category || ''}
                          onChange={(e) => handleCellEdit(rowIndex, 'category', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.goal || ''}
                          onChange={(e) => handleCellEdit(rowIndex, 'goal', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.area || ''}
                          onChange={(e) => handleCellEdit(rowIndex, 'area', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Importing View
  if (step === 'importing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Importing Roadmap Items</h2>
          <p className="text-sm text-slate-600 mb-6">Please wait while we process your data...</p>
          <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-lg font-bold text-blue-600">{importProgress}%</p>
        </div>
      </div>
    );
  }

  // Complete View
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Complete!</h2>
          <div className="flex items-center justify-center gap-8 my-8">
            <div>
              <p className="text-3xl font-bold text-green-600">{importResults.success}</p>
              <p className="text-sm text-slate-600">Succeeded</p>
            </div>
            {importResults.failed > 0 && (
              <div>
                <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                <p className="text-sm text-slate-600">Failed</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/support/admin/roadmap')}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              View Roadmap
            </button>
            <button
              onClick={() => {
                setStep('upload');
                setParsedData([]);
                setImportResults({ success: 0, failed: 0 });
              }}
              className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              Import More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
