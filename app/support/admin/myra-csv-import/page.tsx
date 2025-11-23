'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Users,
  Building2,
  FileText,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportSummary, AnalyzedQuery, ImportCommitResult } from '@/lib/myra-csv/types';

type Step = 'upload' | 'analyzing' | 'review' | 'importing' | 'complete';

export default function MyRACSVImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [analyzedQueries, setAnalyzedQueries] = useState<AnalyzedQuery[]>([]);
  const [importResult, setImportResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a CSV file');
    }
  };

  // Analyze CSV
  const analyzeCSV = async () => {
    if (!file) return;

    setStep('analyzing');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/myra-csv-import/analyze', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setSummary(data.summary);
      setAnalyzedQueries(data.analyzedQueries);
      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('upload');
      setProgress(0);
    }
  };

  // Import approved queries
  const importQueries = async (queriesToImport: AnalyzedQuery[]) => {
    setStep('importing');
    setProgress(0);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/myra-csv-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedQueries: queriesToImport,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const data = await response.json();
      setImportResult(data.result);
      setStep('complete');
    } catch (err: any) {
      setError(err.message);
      setStep('review');
      setProgress(0);
    }
  };

  // Batch approve functions
  const approveAllAutoApprove = () => {
    if (summary) {
      importQueries(summary.autoApprove);
    }
  };

  const approveAutoAndReview = () => {
    if (summary) {
      importQueries([...summary.autoApprove, ...summary.needsReview]);
    }
  };

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Reset to start
  const reset = () => {
    setStep('upload');
    setFile(null);
    setSummary(null);
    setAnalyzedQueries([]);
    setImportResult(null);
    setError(null);
    setProgress(0);
  };

  // Render upload step
  const renderUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">myRA CSV Import</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Upload historical query data with AI-powered analysis
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              {file ? (
                <div>
                  <p className="text-lg font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop CSV file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload CSV with org_name, user_email, user_name, query_text, executed_at
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* CSV Format help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Required CSV Columns:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• org_name - Organization name</li>
              <li>• user_email - User email address</li>
              <li>• user_name - Full name of user</li>
              <li>• query_text - The query that was executed</li>
              <li>• executed_at - Date/time query was run (ISO format or MM/DD/YYYY)</li>
            </ul>
            <p className="text-sm text-blue-700 mt-3">
              Optional columns: category, query_topic, cost_usd, insight_title, status
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={analyzeCSV}
            disabled={!file}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Analyze with AI
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render analyzing step
  const renderAnalyzing = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto text-center"
    >
      <Card>
        <CardContent className="p-12">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyzing CSV Data</h3>
          <p className="text-gray-600 mb-6">
            AI is categorizing queries and matching entities...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}% complete</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render review step with three-tier approval
  const renderReview = () => {
    if (!summary) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header with summary stats */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Review Import</h2>
            <p className="text-gray-600 mt-1">
              {summary.stats.total} queries analyzed • {summary.stats.newOrgsCount} new orgs •{' '}
              {summary.stats.newUsersCount} new users
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Three-tier summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Green tier - Auto-approve */}
          <Card className="border-2 border-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Auto-Approve
                </CardTitle>
                <Badge variant="success">{summary.stats.autoApproveCount}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                High confidence (&gt;90%) - ready to import
              </p>
              {summary.stats.autoApproveCount > 0 && (
                <button
                  onClick={approveAllAutoApprove}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Import {summary.stats.autoApproveCount} Queries
                </button>
              )}
            </CardContent>
          </Card>

          {/* Yellow tier - Needs review */}
          <Card className="border-2 border-yellow-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Needs Review
                </CardTitle>
                <Badge variant="warning">{summary.stats.needsReviewCount}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Medium confidence (70-90%) - review suggested
              </p>
              {summary.stats.needsReviewCount > 0 && (
                <button
                  onClick={approveAutoAndReview}
                  className="w-full py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  Import All ({summary.stats.autoApproveCount + summary.stats.needsReviewCount})
                </button>
              )}
            </CardContent>
          </Card>

          {/* Red tier - Requires fix */}
          <Card className="border-2 border-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Requires Fix
                </CardTitle>
                <Badge variant="destructive">{summary.stats.requiresFixCount}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Low confidence (&lt;70%) - needs correction
              </p>
              {summary.stats.requiresFixCount > 0 && (
                <button className="w-full py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed">
                  Cannot Import
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grouped issues for batch review */}
        {Object.entries(summary.groupedIssues).map(([groupName, queries]) => {
          if (queries.length === 0) return null;

          const isExpanded = expandedGroups.has(groupName);
          const groupLabels: Record<string, { title: string; description: string; icon: any }> = {
            orgFuzzyMatches: {
              title: 'Organization Fuzzy Matches',
              description: 'Organizations matched with similar names',
              icon: Building2,
            },
            userFuzzyMatches: {
              title: 'User Fuzzy Matches',
              description: 'Users matched with similar names',
              icon: Users,
            },
            missingOrgs: {
              title: 'New Organizations',
              description: 'Organizations that will be created',
              icon: Building2,
            },
            missingUsers: {
              title: 'New Users',
              description: 'Users that will be created',
              icon: Users,
            },
            lowCategoryConfidence: {
              title: 'Low Category Confidence',
              description: 'AI categorization with lower confidence',
              icon: Sparkles,
            },
            validationErrors: {
              title: 'Validation Errors',
              description: 'Queries with data quality issues',
              icon: XCircle,
            },
          };

          const groupInfo = groupLabels[groupName];
          if (!groupInfo) return null;

          const Icon = groupInfo.icon;

          return (
            <Card key={groupName} className="border border-gray-300">
              <CardHeader className="pb-3">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 -m-6 p-6 rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-base">{groupInfo.title}</CardTitle>
                      <p className="text-sm text-gray-600">{groupInfo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{queries.length} queries</Badge>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              </CardHeader>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {queries.slice(0, 20).map((query) => (
                          <div
                            key={query.rowNumber}
                            className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  Row {query.rowNumber}: {query.finalQuery.org_name} -{' '}
                                  {query.finalQuery.user_name}
                                </p>
                                <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                  {query.finalQuery.query_text}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  query.overallConfidence >= 90
                                    ? 'success'
                                    : query.overallConfidence >= 70
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="ml-2"
                              >
                                {query.overallConfidence}%
                              </Badge>
                            </div>
                            {query.issues.map((issue, idx) => (
                              <p key={idx} className="text-xs text-gray-500 mt-2">
                                • {issue.message}
                              </p>
                            ))}
                          </div>
                        ))}
                        {queries.length > 20 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            ... and {queries.length - 20} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </motion.div>
    );
  };

  // Render importing step
  const renderImporting = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto text-center"
    >
      <Card>
        <CardContent className="p-12">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Importing Queries</h3>
          <p className="text-gray-600 mb-6">Creating organizations, users, and queries...</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-green-600 to-emerald-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}% complete</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render complete step
  const renderComplete = () => {
    if (!importResult) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Import Complete!</CardTitle>
                <p className="text-gray-600">Successfully imported myRA query data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Queries Imported</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {importResult.summary.queriesImported}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Orgs Created</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {importResult.summary.orgsCreated}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600 font-medium">Users Created</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {importResult.summary.usersCreated}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-amber-600 font-medium">Total Cost</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">
                  ${importResult.summary.totalCost.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Created entities */}
            {importResult.createdOrgs.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  New Organizations Created ({importResult.createdOrgs.length})
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="space-y-1">
                    {importResult.createdOrgs.map((org) => (
                      <p key={org.orgId} className="text-sm text-gray-700">
                        • {org.orgName}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {importResult.createdUsers.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  New Users Created ({importResult.createdUsers.length})
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="space-y-1">
                    {importResult.createdUsers.map((user) => (
                      <p key={user.userId} className="text-sm text-gray-700">
                        • {user.userName} ({user.userEmail})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  Errors ({importResult.errors.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-700">
                      Row {err.rowNumber}: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700"
              >
                Import Another File
              </button>
              <button
                onClick={() => window.location.href = '/support/admin'}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {step === 'upload' && renderUpload()}
        {step === 'analyzing' && renderAnalyzing()}
        {step === 'review' && renderReview()}
        {step === 'importing' && renderImporting()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
}
