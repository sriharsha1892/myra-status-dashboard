// myRA Activity Import - Screenshot Upload & Review Interface
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileImage,
  X,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ConfidenceBadge } from '@/components/myra/ConfidenceBadge';
import { ImportSummaryCards } from '@/components/myra/ImportSummaryCards';
import type { StagingRecord, ImportStats } from '@/lib/myra/types';

type ImportStage = 'upload' | 'processing' | 'review' | 'committing' | 'complete';

interface ProcessingProgress {
  stage: string;
  current: number;
  total: number;
  currentItem?: string;
}

export default function MyraActivityImportPage() {
  // Stage management
  const [stage, setStage] = useState<ImportStage>('upload');

  // Upload state
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  const [excludedUsers, setExcludedUsers] = useState<string[]>([
    'Krati Agarwal',
    'Sudeshana',
  ]);
  const [newExcludedUser, setNewExcludedUser] = useState('');

  // Processing state
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'Initializing',
    current: 0,
    total: 0,
  });
  const [batchId, setBatchId] = useState<string | null>(null);

  // Review state
  const [stagingRecords, setStagingRecords] = useState<StagingRecord[]>([]);
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    extracted: 0,
    auto_approved: 0,
    needs_review: 0,
    failed: 0,
  });
  const [expandedSections, setExpandedSections] = useState<{
    needs_review: boolean;
    reviewed: boolean;
    approved: boolean;
  }>({
    needs_review: true,
    reviewed: false,
    approved: false,
  });
  const [editingRecord, setEditingRecord] = useState<string | null>(null);

  // Organizations and users for dropdowns (loaded during review)
  const [allOrgs, setAllOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email?: string }>>([]);

  // Screenshot upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setScreenshots((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: true,
  });

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const addExcludedUser = () => {
    if (newExcludedUser.trim()) {
      setExcludedUsers([...excludedUsers, newExcludedUser.trim()]);
      setNewExcludedUser('');
    }
  };

  const removeExcludedUser = (user: string) => {
    setExcludedUsers(excludedUsers.filter((u) => u !== user));
  };

  // Start import process
  const startImport = async () => {
    if (screenshots.length === 0 || !batchName.trim()) {
      alert('Please provide batch name and at least one screenshot');
      return;
    }

    setStage('processing');
    setProgress({ stage: 'Uploading screenshots', current: 0, total: screenshots.length });

    try {
      const formData = new FormData();
      formData.append('batchName', batchName);
      if (description) formData.append('description', description);
      formData.append('excludedUsers', JSON.stringify(excludedUsers));

      screenshots.forEach((file, index) => {
        formData.append(`screenshot_${index}`, file);
      });

      const response = await fetch('/api/myra/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setBatchId(result.batch_id);

      // Load batch details for review
      await loadBatchForReview(result.batch_id);
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
      setStage('upload');
    }
  };

  // Load batch for review
  const loadBatchForReview = async (batchId: string) => {
    setProgress({ stage: 'Loading results', current: 0, total: 1 });

    try {
      const response = await fetch(`/api/myra/import?batchId=${batchId}`);
      const data = await response.json();

      setStagingRecords(data.staging_records);

      // Calculate statistics
      const newStats: ImportStats = {
        total: data.staging_records.length,
        extracted: data.staging_records.filter((r: StagingRecord) => r.mapping_status !== 'failed')
          .length,
        auto_approved: data.staging_records.filter(
          (r: StagingRecord) => r.mapping_status === 'approved'
        ).length,
        needs_review: data.staging_records.filter(
          (r: StagingRecord) => r.mapping_status === 'needs_review'
        ).length,
        failed: data.staging_records.filter((r: StagingRecord) => r.mapping_status === 'failed')
          .length,
      };
      setStats(newStats);

      // Load organizations and users for editing
      await loadOrgsAndUsers();

      setStage('review');
    } catch (error: any) {
      console.error('Load batch error:', error);
      alert(`Failed to load batch: ${error.message}`);
      setStage('upload');
    }
  };

  const loadOrgsAndUsers = async () => {
    try {
      // TODO: Create API endpoints for these or load from context
      // For now, placeholder - would fetch from /api/trial-orgs and /api/trial-users
      setAllOrgs([]);
      setAllUsers([]);
    } catch (error) {
      console.error('Failed to load orgs/users:', error);
    }
  };

  // Update staging record
  const updateStagingRecord = async (stagingId: string, updates: Partial<StagingRecord>) => {
    try {
      const response = await fetch(`/api/myra/staging/${stagingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const { record } = await response.json();

      // Update local state
      setStagingRecords((prev) =>
        prev.map((r) => (r.staging_id === stagingId ? { ...r, ...record } : r))
      );

      setEditingRecord(null);
    } catch (error: any) {
      console.error('Update error:', error);
      alert(`Failed to update record: ${error.message}`);
    }
  };

  // Commit to production
  const commitToProduction = async () => {
    if (!batchId) return;

    setStage('committing');
    setProgress({ stage: 'Committing to production', current: 0, total: 1 });

    try {
      const response = await fetch('/api/myra/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });

      if (!response.ok) {
        throw new Error('Commit failed');
      }

      const result = await response.json();
      setStage('complete');

      alert(`Successfully committed ${result.statistics.successful} insights!`);
    } catch (error: any) {
      console.error('Commit error:', error);
      alert(`Commit failed: ${error.message}`);
      setStage('review');
    }
  };

  // Group records by status
  const groupedRecords = {
    needs_review: stagingRecords.filter((r) => r.mapping_status === 'needs_review'),
    reviewed: stagingRecords.filter((r) => r.mapping_status === 'reviewed'),
    approved: stagingRecords.filter((r) => r.mapping_status === 'approved'),
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">myRA Activity Import</h1>
          <p className="text-gray-600 mt-2">
            Upload screenshots of myRA AI activity to integrate with trial organization tracking
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {(['upload', 'processing', 'review', 'committing', 'complete'] as const).map(
              (s, index) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      stage === s
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : index < ['upload', 'processing', 'review', 'committing', 'complete'].indexOf(stage)
                        ? 'border-green-600 bg-green-50 text-green-600'
                        : 'border-gray-300 bg-gray-50 text-gray-400'
                    }`}
                  >
                    {index <
                    ['upload', 'processing', 'review', 'committing', 'complete'].indexOf(stage) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium capitalize">{s}</span>
                  {index < 4 && <div className="w-16 h-0.5 bg-gray-300 mx-4" />}
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Upload Stage */}
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Batch Configuration</CardTitle>
                <CardDescription>Set up your import batch details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="batchName">Batch Name *</Label>
                  <Input
                    id="batchName"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Week of Jan 15-19 Activity"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional notes about this import batch"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Excluded Users</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Activity from these users will be ignored during extraction
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {excludedUsers.map((user) => (
                      <Badge key={user} variant="secondary" className="flex items-center gap-1">
                        {user}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeExcludedUser(user)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newExcludedUser}
                      onChange={(e) => setNewExcludedUser(e.target.value)}
                      placeholder="Add user name to exclude"
                      onKeyDown={(e) => e.key === 'Enter' && addExcludedUser()}
                    />
                    <Button onClick={addExcludedUser} size="sm">
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Screenshots</CardTitle>
                <CardDescription>
                  Drop your myRA activity screenshot images here (PNG, JPG, WEBP)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">
                        Drag & drop screenshots here, or click to select
                      </p>
                      <p className="text-sm text-gray-500">Supports PNG, JPG, WEBP</p>
                    </div>
                  )}
                </div>

                {screenshots.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">
                      Selected Screenshots ({screenshots.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {screenshots.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                            <FileImage className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                          <button
                            onClick={() => removeScreenshot(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={startImport}
                    disabled={screenshots.length === 0 || !batchName.trim()}
                    size="lg"
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Batch
                </CardTitle>
                <CardDescription>
                  AI is extracting insights and mapping to your organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{progress.stage}</span>
                      <span className="text-sm text-gray-600">
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  {progress.currentItem && (
                    <p className="text-sm text-gray-600">Processing: {progress.currentItem}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Review Stage */}
        {stage === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <ImportSummaryCards stats={stats} />

            <Card>
              <CardHeader>
                <CardTitle>Review Mapped Insights</CardTitle>
                <CardDescription>
                  Review AI-generated mappings before committing to production. Focus on yellow and
                  red items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Needs Review Section */}
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('needs_review')}
                    className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-900">
                        Needs Review ({groupedRecords.needs_review.length})
                      </span>
                    </div>
                    {expandedSections.needs_review ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </button>
                  {expandedSections.needs_review && (
                    <div className="p-4 space-y-3">
                      {groupedRecords.needs_review.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No records need review
                        </p>
                      ) : (
                        groupedRecords.needs_review.map((record) => (
                          <RecordRow
                            key={record.staging_id}
                            record={record}
                            onUpdate={updateStagingRecord}
                            isEditing={editingRecord === record.staging_id}
                            setEditing={setEditingRecord}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Reviewed Section */}
                <div className="border border-yellow-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('reviewed')}
                    className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-900">
                        Reviewed ({groupedRecords.reviewed.length})
                      </span>
                    </div>
                    {expandedSections.reviewed ? (
                      <ChevronUp className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-yellow-600" />
                    )}
                  </button>
                  {expandedSections.reviewed && (
                    <div className="p-4 space-y-3">
                      {groupedRecords.reviewed.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No reviewed records</p>
                      ) : (
                        groupedRecords.reviewed.map((record) => (
                          <RecordRow
                            key={record.staging_id}
                            record={record}
                            onUpdate={updateStagingRecord}
                            isEditing={editingRecord === record.staging_id}
                            setEditing={setEditingRecord}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Approved Section */}
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('approved')}
                    className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        Auto-Approved ({groupedRecords.approved.length})
                      </span>
                    </div>
                    {expandedSections.approved ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                  {expandedSections.approved && (
                    <div className="p-4 space-y-3">
                      {groupedRecords.approved.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No auto-approved records
                        </p>
                      ) : (
                        groupedRecords.approved.map((record) => (
                          <RecordRow
                            key={record.staging_id}
                            record={record}
                            onUpdate={updateStagingRecord}
                            isEditing={editingRecord === record.staging_id}
                            setEditing={setEditingRecord}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={() => setStage('upload')} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Start New Import
                  </Button>
                  <Button
                    onClick={commitToProduction}
                    size="lg"
                    className="gap-2"
                    disabled={stats.needs_review > 0}
                  >
                    <Save className="w-4 h-4" />
                    Commit to Production ({stats.auto_approved + stats.needs_review} insights)
                  </Button>
                </div>

                {stats.needs_review > 0 && (
                  <p className="text-sm text-red-600 text-right">
                    Please review all red items before committing
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Committing Stage */}
        {stage === 'committing' && (
          <motion.div
            key="committing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Committing to Production
                </CardTitle>
                <CardDescription>Inserting approved insights into platform_queries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-600"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Complete Stage */}
        {stage === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-900 mb-2">Import Complete!</h2>
                <p className="text-green-700 mb-6">
                  Your myRA activity data has been successfully integrated with trial organizations.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setStage('upload')}>
                    Import Another Batch
                  </Button>
                  <Button onClick={() => (window.location.href = '/support/admin/trial-orgs')}>
                    View Trial Organizations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual record row component
function RecordRow({
  record,
  onUpdate,
  isEditing,
  setEditing,
}: {
  record: StagingRecord;
  onUpdate: (id: string, updates: Partial<StagingRecord>) => void;
  isEditing: boolean;
  setEditing: (id: string | null) => void;
}) {
  const [localOrgId, setLocalOrgId] = useState(record.mapped_org_id);
  const [localUserId, setLocalUserId] = useState(record.mapped_user_id);

  const saveChanges = () => {
    onUpdate(record.staging_id, {
      mapped_org_id: localOrgId,
      mapped_user_id: localUserId,
      mapping_status: 'reviewed',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{record.raw_insight_title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            {record.raw_org_name} • {record.raw_user_name || record.raw_user_email}
          </p>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(record.staging_id)}
            className="ml-4"
          >
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <Label className="text-xs text-gray-600">Organization Mapping</Label>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <Input
                value={localOrgId || ''}
                onChange={(e) => setLocalOrgId(e.target.value)}
                placeholder="Organization ID"
                className="text-sm"
              />
            ) : (
              <>
                <span className="text-sm font-medium">{record.mapped_org_id || 'Not mapped'}</span>
                <ConfidenceBadge score={record.mapped_org_confidence} size="sm" />
              </>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs text-gray-600">User Mapping</Label>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <Input
                value={localUserId || ''}
                onChange={(e) => setLocalUserId(e.target.value)}
                placeholder="User ID or CREATE_NEW"
                className="text-sm"
              />
            ) : (
              <>
                <span className="text-sm font-medium">
                  {record.mapped_user_id === 'CREATE_NEW'
                    ? 'Will create new'
                    : record.mapped_user_id || 'Not mapped'}
                </span>
                <ConfidenceBadge score={record.mapped_user_confidence} size="sm" />
              </>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveChanges}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
