'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
// @ts-ignore
import * as fuzzball from 'fuzzball';

interface ParsedRow {
  orgName: string;
  email: string;
  fullName: string;
  title?: string;
  accountManager?: string;
  domain?: string;
  rowIndex: number;
}

interface ValidationIssue {
  rowIndex: number;
  type: 'duplicate_org' | 'missing_email' | 'duplicate_email' | 'email_typo';
  message: string;
  suggestedOrgId?: string;
  suggestedOrgName?: string;
  matchScore?: number;
  suggestedEmail?: string;
  resolution: 'create_new' | 'link_existing' | 'skip' | 'fix_email' | 'pending';
}

type Step = 1 | 2 | 3;

export default function ImportWizardPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMappings, setColumnMappings] = useState({
    orgName: '',
    email: '',
    fullName: '',
    title: '',
    accountManager: '',
    domain: '',
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successful: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Step 1: File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        toast.error('File is empty');
        return;
      }

      // Extract column names
      const columns = Object.keys(jsonData[0]);
      setAvailableColumns(columns);

      // Auto-detect column mappings
      const mappings = {
        orgName: detectColumn(columns, ['company', 'org', 'organization', 'company name', 'org name']),
        email: detectColumn(columns, ['email', 'email address', 'e-mail']),
        fullName: detectColumn(columns, ['name', 'full name', 'user name', 'contact name']),
        title: detectColumn(columns, ['title', 'role', 'position', 'job title']),
        accountManager: detectColumn(columns, ['account manager', 'sales poc', 'am', 'manager']),
        domain: detectColumn(columns, ['domain', 'industry', 'sector']),
      };

      setColumnMappings(mappings);
      toast.success(`Loaded ${jsonData.length} rows`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file');
    }
  };

  const detectColumn = (columns: string[], keywords: string[]): string => {
    const normalized = columns.map((c) => c.toLowerCase().trim());
    for (const keyword of keywords) {
      const match = normalized.find((col) => col.includes(keyword));
      if (match) {
        return columns[normalized.indexOf(match)];
      }
    }
    return columns[0] || '';
  };

  const handleParseData = async () => {
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

      const parsed: ParsedRow[] = jsonData.map((row, index) => ({
        orgName: row[columnMappings.orgName] || '',
        email: row[columnMappings.email] || '',
        fullName: row[columnMappings.fullName] || '',
        title: row[columnMappings.title] || '',
        accountManager: row[columnMappings.accountManager] || '',
        domain: row[columnMappings.domain] || '',
        rowIndex: index + 2, // +2 because row 1 is header, and Excel is 1-indexed
      }));

      setParsedData(parsed);
      setCurrentStep(2);
      await validateData(parsed);
    } catch (error) {
      console.error('Error parsing data:', error);
      toast.error('Failed to parse data');
    }
  };

  // Step 2: Validate with Smart Suggestions
  const validateData = async (rows: ParsedRow[]) => {
    const supabase = createClient();
    const issues: ValidationIssue[] = [];

    // Fetch existing organizations for fuzzy matching
    const { data: existingOrgs } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name');

    const orgNames = (existingOrgs as any)?.map((o: any) => o.org_name) || [];

    // Fetch existing emails
    const { data: existingUsers } = await supabase
      .from('trial_users')
      .select('email');

    const existingEmails = new Set((existingUsers as any)?.map((u: any) => u.email.toLowerCase()) || []);

    rows.forEach((row) => {
      // Check for similar org names
      if (row.orgName && existingOrgs) {
        for (const existingOrg of existingOrgs as any) {
          const score = fuzzball.ratio(row.orgName.toLowerCase(), (existingOrg as any).org_name.toLowerCase());
          if (score >= 85) {
            issues.push({
              rowIndex: row.rowIndex,
              type: 'duplicate_org',
              message: `"${row.orgName}" is ${score}% similar to existing "${(existingOrg as any).org_name}"`,
              suggestedOrgId: (existingOrg as any).org_id,
              suggestedOrgName: (existingOrg as any).org_name,
              matchScore: score,
              resolution: 'pending',
            });
            break;
          }
        }
      }

      // Check for missing email
      if (!row.email || row.email.trim() === '') {
        issues.push({
          rowIndex: row.rowIndex,
          type: 'missing_email',
          message: `Missing email for ${row.fullName}`,
          resolution: 'pending',
        });
      }

      // Check for duplicate emails
      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        issues.push({
          rowIndex: row.rowIndex,
          type: 'duplicate_email',
          message: `Email ${row.email} already exists`,
          resolution: 'pending',
        });
      }

      // Check for email typos
      if (row.email) {
        const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        const emailParts = row.email.split('@');
        if (emailParts.length === 2) {
          const domain = emailParts[1];
          for (const commonDomain of commonDomains) {
            const score = fuzzball.ratio(domain.toLowerCase(), commonDomain);
            if (score >= 80 && score < 100) {
              issues.push({
                rowIndex: row.rowIndex,
                type: 'email_typo',
                message: `Possible typo in email domain: ${domain}`,
                suggestedEmail: `${emailParts[0]}@${commonDomain}`,
                resolution: 'pending',
              });
              break;
            }
          }
        }
      }
    });

    setValidationIssues(issues);
  };

  const handleResolveIssue = (issueIndex: number, resolution: ValidationIssue['resolution']) => {
    setValidationIssues((prev) =>
      prev.map((issue, index) =>
        index === issueIndex ? { ...issue, resolution } : issue
      )
    );
  };

  const handleUpdateEmail = (rowIndex: number, newEmail: string) => {
    setParsedData((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex ? { ...row, email: newEmail } : row
      )
    );
  };

  const canProceedToStep3 = () => {
    return validationIssues.every((issue) => issue.resolution !== 'pending');
  };

  // Step 3: Execute Import
  const handleImport = async () => {
    const supabase = createClient();
    setImporting(true);
    let successful = 0;
    let skipped = 0;

    try{
      // Group rows by organization
      const orgGroups = new Map<string, ParsedRow[]>();

      parsedData.forEach((row) => {
        const issue = validationIssues.find((i) => i.rowIndex === row.rowIndex && i.type === 'duplicate_org');

        let orgKey: string;
        if (issue?.resolution === 'link_existing' && issue.suggestedOrgId) {
          orgKey = issue.suggestedOrgId;
        } else if (issue?.resolution === 'skip') {
          skipped++;
          return;
        } else {
          orgKey = row.orgName;
        }

        if (!orgGroups.has(orgKey)) {
          orgGroups.set(orgKey, []);
        }
        orgGroups.get(orgKey)!.push(row);
      });

      // Insert organizations and users
      for (const [orgKey, rows] of orgGroups) {
        let orgId: string;

        // Check if this is a link to existing org
        const firstRow = rows[0];
        const issue = validationIssues.find((i) => i.rowIndex === firstRow.rowIndex && i.type === 'duplicate_org');

        if (issue?.resolution === 'link_existing' && issue.suggestedOrgId) {
          orgId = issue.suggestedOrgId;
        } else {
          // Create new organization
          const { data: newOrg, error: orgError } = await supabase
            // -ignore - Supabase typing issue with dynamic columns

            .from('trial_organizations')
            // @ts-ignore - Supabase typing issue with dynamic columns
            // -ignore - Supabase typing issue with dynamic columns

            .insert({
              org_name: firstRow.orgName,
              org_domain: firstRow.domain,
              account_manager: firstRow.accountManager,
              org_lifecycle_stage: 'prospect',
            })
            .select()
            .single();

          if (orgError || !newOrg) {
            console.error('Error creating org:', orgError);
            skipped += rows.length;
            continue;
          }

          orgId = (newOrg as any).org_id;
        }

        // Insert users for this org
        for (const row of rows) {
          const userIssue = validationIssues.find(
            (i) => i.rowIndex === row.rowIndex && (i.type === 'missing_email' || i.type === 'duplicate_email')
          );

          if (userIssue?.resolution === 'skip' || !row.email) {
            skipped++;
            continue;
          }

          // @ts-ignore - Supabase typing issue with dynamic columns
          const { error: userError } = await supabase.from('trial_users').insert({
            org_id: orgId,
            full_name: row.fullName,
            email: row.email,
            title_role: row.title,
          });

          if (userError) {
            console.error('Error creating user:', userError);
            skipped++;
          } else {
            successful++;
          }
        }
      }

      // Log import batch
      // @ts-ignore - Supabase typing issue with dynamic columns
      await supabase.from('import_batches').insert({
        imported_by: 'current_user', // TODO: Get from auth
        file_name: file?.name || 'unknown',
        total_rows: parsedData.length,
        successful_rows: successful,
        skipped_rows: skipped,
        import_status: 'completed',
      });

      setImportResult({ successful, skipped, total: parsedData.length });
      setCurrentStep(3);
      toast.success(`Import completed! ${successful} rows imported successfully`);
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/trials')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Trial Data</h1>
              <p className="text-sm text-gray-500 mt-0.5">Bulk upload organizations and users from Excel/CSV</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-4 flex-1">
                <div className={`flex items-center gap-3 ${step <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    step < currentStep ? 'bg-blue-600 text-white' : step === currentStep ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? '✓' : step}
                  </div>
                  <span className="text-sm font-medium">
                    {step === 1 ? 'Upload' : step === 2 ? 'Validate' : 'Import'}
                  </span>
                </div>
                {step < 3 && <div className={`flex-1 h-0.5 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Step 1: Upload & Parse */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Step 1: Upload File</h3>

              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-600 font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">Excel (.xlsx, .xls) or CSV files</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setParsedData([]);
                        setColumnMappings({ orgName: '', email: '', fullName: '', title: '', accountManager: '', domain: '' });
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Column Mappings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(columnMappings).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            {key.replace(/([A-Z])/g, ' $1').trim()} {['orgName', 'email', 'fullName'].includes(key) && '*'}
                          </label>
                          <select
                            value={value}
                            onChange={(e) => setColumnMappings({ ...columnMappings, [key]: e.target.value })}
                            className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select column...</option>
                            {availableColumns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleParseData}
                      disabled={!columnMappings.orgName || !columnMappings.email || !columnMappings.fullName}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Continue to Validation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Validate */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Step 2: Validate & Resolve Issues</h3>

              {validationIssues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">All {parsedData.length} rows look good!</p>
                  <p className="text-xs text-gray-500 mt-1">No issues found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Found {validationIssues.length} potential issues. Please review and resolve:
                  </p>

                  {validationIssues.map((issue, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Row {issue.rowIndex}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{issue.message}</p>
                        </div>
                        {issue.matchScore && (
                          <span className="text-xs font-bold text-blue-600">{issue.matchScore}% match</span>
                        )}
                      </div>

                      {issue.type === 'duplicate_org' && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'create_new'}
                              onChange={() => handleResolveIssue(index, 'create_new')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Create new organization</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'link_existing'}
                              onChange={() => handleResolveIssue(index, 'link_existing')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Link to existing: "{issue.suggestedOrgName}"</span>
                            <span className="text-xs text-blue-600 font-medium">RECOMMENDED</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'skip'}
                              onChange={() => handleResolveIssue(index, 'skip')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Skip this row</span>
                          </label>
                        </div>
                      )}

                      {issue.type === 'missing_email' && (
                        <div className="space-y-2">
                          <input
                            type="email"
                            placeholder="Enter email address..."
                            onChange={(e) => {
                              handleUpdateEmail(issue.rowIndex, e.target.value);
                              if (e.target.value) handleResolveIssue(index, 'fix_email');
                            }}
                            className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'skip'}
                              onChange={() => handleResolveIssue(index, 'skip')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Skip this row</span>
                          </label>
                        </div>
                      )}

                      {issue.type === 'email_typo' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              handleUpdateEmail(issue.rowIndex, issue.suggestedEmail!);
                              handleResolveIssue(index, 'fix_email');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Use suggested: {issue.suggestedEmail}
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'skip'}
                              onChange={() => handleResolveIssue(index, 'skip')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Keep original</span>
                          </label>
                        </div>
                      )}

                      {issue.type === 'duplicate_email' && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`issue-${index}`}
                              checked={issue.resolution === 'skip'}
                              onChange={() => handleResolveIssue(index, 'skip')}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Skip this row (email already exists)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canProceedToStep3()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {importing ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && importResult && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Successfully imported {importResult.successful} of {importResult.total} rows
              {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
            </p>
            <button
              onClick={() => router.push('/trials')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              View Organizations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
