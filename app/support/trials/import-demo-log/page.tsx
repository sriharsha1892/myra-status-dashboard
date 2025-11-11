'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface DemoLogRow {
  id: string;
  date: string;
  time: string;
  salesPoc: string;
  companyName: string;
  contactTitle: string;
  contactEmail: string;
  domain: string;
  demoStatus: string;
  toolsUsed: string;
  painPoints: string;
  nextSteps: string;
  nextStepsDate: string;
  observations: string;
  generalNotes: string;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  uniqueOrgs: number;
  skippedRows: number;
  issues: string[];
}

interface OrgUserMap {
  [orgName: string]: DemoLogRow[];
}

export default function ImportDemoLogPage() {
  const router = useRouter();

  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'complete'>(
    'upload'
  );
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DemoLogRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [orgMap, setOrgMap] = useState<OrgUserMap>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({
    orgsCreated: 0,
    usersCreated: 0,
    activitiesLogged: 0,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet);

      const parsed: DemoLogRow[] = [];
      const issues: string[] = [];
      const orgMap: OrgUserMap = {};

      rawData.forEach((row: any, idx: number) => {
        const demoLogRow: DemoLogRow = {
          id: row["ID (Don't Edit)"] || '',
          date: row['Date'] || '',
          time: row['Time (in IST)'] || '',
          salesPoc: row['Sales POC'] || '',
          companyName: row['Company Name'] || '',
          contactTitle: row['Title/Role (Primary Contact)'] || '',
          contactEmail: row['Email (Primary Contact)'] || '',
          domain: row['Domain'] || '',
          demoStatus: row['Demo Status'] || '',
          toolsUsed: row['Current AI/Research Tools Used'] || '',
          painPoints: row['Current Pain Points Identified'] || '',
          nextSteps: row['Immediate Next Steps'] || '',
          nextStepsDate: row['Date (Linked to next steps)'] || '',
          observations: row['Demo Observations'] || '',
          generalNotes: row['General Notes (Log Feature Requests| Challenges faced| Key notes separately here)'] || '',
        };

        // Validation
        if (!demoLogRow.companyName || !demoLogRow.contactEmail) {
          issues.push(`Row ${idx + 2}: Missing company name or email`);
          return;
        }

        // Email validation
        if (!demoLogRow.contactEmail.includes('@')) {
          issues.push(`Row ${idx + 2}: Invalid email format`);
          return;
        }

        parsed.push(demoLogRow);

        // Group by org
        if (!orgMap[demoLogRow.companyName]) {
          orgMap[demoLogRow.companyName] = [];
        }
        orgMap[demoLogRow.companyName].push(demoLogRow);
      });

      setParsedData(parsed);
      setOrgMap(orgMap);

      const summary: ImportSummary = {
        totalRows: rawData.length,
        validRows: parsed.length,
        uniqueOrgs: Object.keys(orgMap).length,
        skippedRows: rawData.length - parsed.length,
        issues,
      };

      setSummary(summary);
      setStep('review');

      if (issues.length > 0) {
        toast.error(`Found ${issues.length} issues during parsing`);
      } else {
        toast.success('File parsed successfully!');
      }
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse Excel file');
    }
  };

  const handleStartImport = async () => {
    const supabase = createClient();
    if (!summary || parsedData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setStep('importing');
    let orgsCreated = 0;
    let usersCreated = 0;
    let activitiesLogged = 0;
    const totalOrgs = Object.keys(orgMap).length;
    let currentOrg = 0;

    try {
      // Create/get organizations and users
      for (const [orgName, rows] of Object.entries(orgMap)) {
        currentOrg++;
        setImportProgress(Math.round((currentOrg / totalOrgs) * 100));

        // Check if org exists
        const { data: existingOrg } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .eq('org_name', orgName)
          .single();

        let orgId: string;

        if (!existingOrg) {
          // Create new org
          const { data: newOrg, error: orgError } = await supabase
            // -ignore - Supabase typing issue with dynamic columns

            .from('trial_organizations')
            // @ts-ignore - Supabase typing issue with dynamic columns
            // -ignore - Supabase typing issue with dynamic columns

            .insert({
              org_name: orgName,
              org_domain: rows[0].domain || null,
              trial_start_date: new Date().toISOString().split('T')[0],
              engagement_score: 50,
            })
            .select('org_id')
            .single();

          if (orgError) {
            console.error(`Error creating org ${orgName}:`, orgError);
            continue;
          }

          orgId = (newOrg as any).org_id;
          orgsCreated++;
        } else {
          orgId = (existingOrg as any).org_id;
        }

        // Create users for this org
        const uniqueEmails = new Set<string>();

        for (const row of rows) {
          if (uniqueEmails.has(row.contactEmail)) continue;
          uniqueEmails.add(row.contactEmail);

          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('trial_users')
            .select('user_id')
            .eq('org_id', orgId)
            .eq('email', row.contactEmail)
            .single();

          if (!existingUser) {
            // Create new user
            const { data: newUser, error: userError } = await supabase
              // -ignore - Supabase typing issue with dynamic columns

              .from('trial_users')
              // @ts-ignore - Supabase typing issue with dynamic columns
              // -ignore - Supabase typing issue with dynamic columns

              .insert({
                org_id: orgId,
                name: row.contactTitle || 'Unknown',
                email: row.contactEmail,
                role: row.contactTitle || null,
                salesforce_id: null,
                current_stage: row.demoStatus === 'Completed' ? 'exploring' : 'invited',
                account_manager: 'Unassigned',
                sales_poc: row.salesPoc || null,
              })
              .select('user_id')
              .single();

            if (userError) {
              console.error(`Error creating user ${row.contactEmail}:`, userError);
              continue;
            }

            usersCreated++;

            // Log an activity for this user
            if (row.observations || row.painPoints || row.nextSteps) {
              // @ts-ignore - Supabase typing issue with dynamic columns
              await supabase.from('user_activities').insert({
                user_id: (newUser as any).user_id,
                org_id: orgId,
                activity_type: 'interaction',
                category: 'usage',
                title: `Demo Call - ${row.demoStatus}`,
                description: `Tools: ${row.toolsUsed}\nPain Points: ${row.painPoints}\nNext Steps: ${row.nextSteps}\nObservations: ${row.observations}`,
                priority: 'medium',
                status: 'open',
                created_by: row.salesPoc || 'Demo Log Import',
              });

              activitiesLogged++;
            }
          }
        }
      }

      setImportStats({
        orgsCreated,
        usersCreated,
        activitiesLogged,
      });

      setStep('complete');
      toast.success('Import completed successfully!');
    } catch (error: any) {
      console.error('Error during import:', error);
      toast.error('Import failed. Please check the logs.');
      setStep('review');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Demo Log Import</h1>
          <p className="text-gray-600 mt-2">
            Import demo call logs and automatically create organizations and platform users
          </p>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Demo Log Excel File
              </h3>
              <p className="text-gray-600 mb-6">
                Select the demo call log Excel file to import (1st tab)
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition">
                  Choose File
                </span>
              </label>
              {file && (
                <p className="text-sm text-green-600 mt-4">
                  ✓ Selected: {file.name}
                </p>
              )}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3">Required Columns:</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Company Name</li>
                <li>• Email (Primary Contact)</li>
                <li>• Title/Role (Primary Contact)</li>
                <li>• Sales POC</li>
                <li>• Demo Status</li>
                <li>• Current Pain Points Identified</li>
                <li>• Demo Observations</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{summary.totalRows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{summary.validRows}</div>
                <div className="text-sm text-gray-600">Valid Rows</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-accent-600">{summary.uniqueOrgs}</div>
                <div className="text-sm text-gray-600">Unique Orgs</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-red-600">{summary.skippedRows}</div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
            </div>

            {/* Organizations Preview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Organizations to Import</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(orgMap).map(([orgName, rows]) => (
                  <div key={orgName} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{orgName}</p>
                        <p className="text-sm text-gray-600">{rows.length} contacts</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {rows.length} users
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues */}
            {summary.issues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h4 className="font-semibold text-yellow-900 mb-3">
                  Issues Found ({summary.issues.length})
                </h4>
                <ul className="text-sm text-yellow-800 space-y-2 max-h-40 overflow-y-auto">
                  {summary.issues.slice(0, 10).map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                  {summary.issues.length > 10 && (
                    <li>• ... and {summary.issues.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleStartImport}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                Start Import ({summary.validRows} rows)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-900">Importing Demo Log...</p>
              <p className="text-gray-600 mt-2">Please wait, this may take a few minutes</p>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{importProgress}% Complete</p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Import Complete!</h2>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{importStats.orgsCreated}</div>
                <div className="text-sm text-blue-700">Organizations Created</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{importStats.usersCreated}</div>
                <div className="text-sm text-green-700">Users Created</div>
              </div>
              <div className="bg-accent-50 rounded-lg p-4 border border-accent-200">
                <div className="text-2xl font-bold text-accent-600">{importStats.activitiesLogged}</div>
                <div className="text-sm text-accent-700">Activities Logged</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/trials')}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                View Organizations
              </button>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedData([]);
                  setSummary(null);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
