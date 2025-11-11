'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { ArrowLeft, Upload, Download, CheckCircle2, AlertTriangle, FileText, Calendar, Tag, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityEvent {
  org_id?: string;
  org_name: string;
  event_date: string;
  event_type: string;
  title: string;
  description?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

interface MappingRule {
  csvColumn: string;
  targetField: 'org_name' | 'event_date' | 'event_type' | 'title' | 'description' | 'metadata';
  transform?: 'date' | 'text' | 'json';
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export default function BulkActivityImportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<MappingRule[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>(['meeting', 'call', 'demo', 'email', 'milestone', 'note', 'other']);
  const [customEventType, setCustomEventType] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<ActivityEvent[]>([]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { data: records } = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value.trim(),
        });

        if (records.length > 0) {
          const headers = Object.keys(records[0]);
          setCsvHeaders(headers);
          setCsvData(records);

          // Auto-detect mappings
          const autoMappings: MappingRule[] = [];

          headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('org') || lowerHeader.includes('company')) {
              autoMappings.push({ csvColumn: header, targetField: 'org_name', transform: 'text' });
            } else if (lowerHeader.includes('date')) {
              autoMappings.push({ csvColumn: header, targetField: 'event_date', transform: 'date' });
            } else if (lowerHeader.includes('type') || lowerHeader.includes('category')) {
              autoMappings.push({ csvColumn: header, targetField: 'event_type', transform: 'text' });
            } else if (lowerHeader.includes('title') || lowerHeader.includes('subject')) {
              autoMappings.push({ csvColumn: header, targetField: 'title', transform: 'text' });
            } else if (lowerHeader.includes('description') || lowerHeader.includes('note') || lowerHeader.includes('comment')) {
              autoMappings.push({ csvColumn: header, targetField: 'description', transform: 'text' });
            }
          });

          setMappings(autoMappings);
          toast.success(`Loaded ${records.length} rows with ${headers.length} columns`);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    };

    reader.readAsText(uploadedFile);
  };

  // Add/update mapping
  const updateMapping = (index: number, field: keyof MappingRule, value: any) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setMappings(newMappings);
  };

  // Add new mapping
  const addMapping = () => {
    setMappings([...mappings, { csvColumn: csvHeaders[0] || '', targetField: 'metadata', transform: 'text' }]);
  };

  // Remove mapping
  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  // Generate preview
  const generatePreview = () => {
    if (csvData.length === 0 || mappings.length === 0) {
      toast.error('Please upload a file and configure mappings');
      return;
    }

    const previewed = csvData.slice(0, 5).map(row => {
      const event: ActivityEvent = {
        org_name: '',
        event_date: '',
        event_type: '',
        title: '',
        description: '',
        metadata: {},
      };

      mappings.forEach(mapping => {
        const value = row[mapping.csvColumn];
        if (!value) return;

        if (mapping.targetField === 'metadata') {
          event.metadata = event.metadata || {};
          event.metadata[mapping.csvColumn] = value;
        } else {
          event[mapping.targetField] = value;
        }
      });

      return event;
    });

    setPreview(previewed);
    toast.success('Preview generated for first 5 rows');
  };

  // Import activities
  const handleImport = async () => {
    if (!user) {
      toast.error('You must be logged in to import');
      return;
    }

    if (csvData.length === 0 || mappings.length === 0) {
      toast.error('Please upload a file and configure mappings');
      return;
    }

    setImporting(true);
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Fetch all org IDs to map org names
      const { data: orgs } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name');

      const orgNameToId = new Map(
        (orgs || []).map(org => [org.org_name.toLowerCase(), org.org_id])
      );

      for (let i = 0; i < csvData.length; i++) {
        try {
          const row = csvData[i];
          const event: any = {
            user_id: user.id,
            created_at: new Date().toISOString(),
          };

          // Apply mappings
          mappings.forEach(mapping => {
            const value = row[mapping.csvColumn];
            if (!value) return;

            if (mapping.targetField === 'metadata') {
              event.metadata = event.metadata || {};
              event.metadata[mapping.csvColumn] = value;
            } else if (mapping.targetField === 'org_name') {
              // Find org_id from org_name
              const orgId = orgNameToId.get(value.toLowerCase());
              if (orgId) {
                event.org_id = orgId;
              } else {
                throw new Error(`Organization not found: ${value}`);
              }
            } else {
              event[mapping.targetField] = value;
            }
          });

          // Validate required fields
          if (!event.org_id) {
            throw new Error('Missing organization');
          }
          if (!event.event_date) {
            throw new Error('Missing event date');
          }
          if (!event.title) {
            throw new Error('Missing title');
          }

          // Set default event type if missing
          if (!event.event_type) {
            event.event_type = 'note';
          }

          // Insert into trial_engagement_log
          const { error } = await supabase
            .from('trial_engagement_log')
            .insert({
              org_id: event.org_id,
              user_id: event.user_id,
              event_type: event.event_type,
              event_date: event.event_date,
              title: event.title,
              description: event.description || '',
              metadata: event.metadata || {},
              created_at: event.created_at,
            });

          if (error) throw error;
          imported++;
        } catch (error: any) {
          failed++;
          errors.push(`Row ${i + 1}: ${error.message}`);
          console.error(`Failed to import row ${i + 1}:`, error);
        }
      }

      setImportResult({ success: true, imported, failed, errors });
      toast.success(`Import complete: ${imported} succeeded, ${failed} failed`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportResult({ success: false, imported, failed, errors });
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = `Organization Name,Event Date,Event Type,Title,Description,Custom Field 1,Custom Field 2
Circle K Europe,2025-01-15,meeting,Kickoff Meeting,Initial trial kickoff with stakeholders,location:Remote,attendees:5
Acme Corp,2025-01-16,demo,Product Demo,Demonstrated core features,duration:60min,sentiment:positive
Test Company,2025-01-17,call,Follow-up Call,Discussed implementation timeline,next_steps:Technical setup,priority:high`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/support/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Activity Import</h1>
          <p className="text-gray-600 mt-2">Import organization activities and timeline events from CSV</p>
        </div>

        {/* Step 1: Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
            <h2 className="text-xl font-bold text-gray-900">Upload CSV File</h2>
          </div>

          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {file ? file.name : 'Click to upload CSV file'}
                </div>
                <div className="text-xs text-gray-500">
                  {file ? `${csvData.length} rows loaded` : 'Drag and drop or click to browse'}
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={downloadTemplate}
              className="flex flex-col items-center justify-center px-6 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <Download className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">Download</span>
              <span className="text-xs text-gray-500">Template</span>
            </button>
          </div>

          {csvHeaders.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">Detected Columns:</div>
              <div className="text-xs text-blue-700">{csvHeaders.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Step 2: Map Fields */}
        {csvHeaders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                <h2 className="text-xl font-bold text-gray-900">Map CSV Columns to Fields</h2>
              </div>
              <button
                onClick={addMapping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                + Add Mapping
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">CSV Column</label>
                    <select
                      value={mapping.csvColumn}
                      onChange={(e) => updateMapping(index, 'csvColumn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-gray-400">→</div>

                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Target Field</label>
                    <select
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(index, 'targetField', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="org_name">Organization Name</option>
                      <option value="event_date">Event Date</option>
                      <option value="event_type">Event Type</option>
                      <option value="title">Title</option>
                      <option value="description">Description</option>
                      <option value="metadata">Custom Metadata</option>
                    </select>
                  </div>

                  <button
                    onClick={() => removeMapping(index)}
                    className="mt-5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {mappings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No mappings configured. Click "Add Mapping" to get started.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={generatePreview}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Generate Preview
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">3</div>
              <h2 className="text-xl font-bold text-gray-900">Preview (First 5 Rows)</h2>
            </div>

            <div className="space-y-3">
              {preview.map((event, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Organization</div>
                      <div className="text-gray-900">{event.org_name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Date</div>
                      <div className="text-gray-900">{event.event_date || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Type</div>
                      <div className="text-gray-900">{event.event_type || '—'}</div>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Title</div>
                      <div className="text-gray-900">{event.title || '—'}</div>
                    </div>
                    {event.description && (
                      <div className="col-span-2 md:col-span-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                        <div className="text-gray-700 text-xs">{event.description}</div>
                      </div>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="col-span-2 md:col-span-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Metadata</div>
                        <div className="text-xs text-gray-600 font-mono">
                          {JSON.stringify(event.metadata, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">4</div>
              <h2 className="text-xl font-bold text-gray-900">Import Activities</h2>
            </div>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">Before importing:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Verify the preview data is correct</li>
                    <li>Ensure organization names match exactly (case-insensitive)</li>
                    <li>Event dates should be in YYYY-MM-DD format</li>
                    <li>Import will create entries in the trial_engagement_log table</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${csvData.length} Activities`}
            </button>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className={`rounded-lg shadow-sm border p-6 ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              {importResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
              <h2 className="text-xl font-bold text-gray-900">Import Results</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-gray-600">Successfully Imported</div>
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Errors:</div>
                <div className="bg-white rounded border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 py-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
