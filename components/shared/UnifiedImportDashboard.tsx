/**
 * Unified Import Dashboard
 *
 * Central hub for all bulk import operations
 * Provides:
 * - Quick access to all 7 import tools
 * - Import history and statistics
 * - Template downloads
 * - Help documentation
 */

'use client';

import { useState } from 'react';
import {
  Upload,
  FileText,
  Users,
  Calendar,
  Building2,
  Sparkles,
  TrendingUp,
  Download,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface ImportTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'ai' | 'csv' | 'excel';
  status: 'active' | 'beta' | 'deprecated';
  features: string[];
  templateUrl?: string;
}

interface ImportStats {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  recentImports: Array<{
    id: string;
    tool: string;
    date: Date;
    recordsImported: number;
    status: 'success' | 'partial' | 'failed';
  }>;
}

// =====================================================
// IMPORT TOOLS CONFIGURATION
// =====================================================

const IMPORT_TOOLS: ImportTool[] = [
  {
    id: 'feature-requests',
    name: 'Feature Requests',
    description: 'Import feature requests from CSV files',
    icon: <TrendingUp className="w-6 h-6" />,
    category: 'csv',
    status: 'active',
    features: ['CSV import', 'Batch processing', 'Duplicate detection', 'Priority validation'],
    templateUrl: '/templates/feature-requests-template.csv',
  },
  {
    id: 'timeline-events-ai',
    name: 'Timeline Events (AI)',
    description: 'AI-powered extraction of timeline events from unstructured text',
    icon: <Sparkles className="w-6 h-6" />,
    category: 'ai',
    status: 'active',
    features: ['AI parsing', '47 event types', 'Date extraction', 'Groq LLM'],
    templateUrl: '/templates/timeline-events-example.txt',
  },
  {
    id: 'trial-users',
    name: 'Trial Users',
    description: 'Import trial users with AI-powered data extraction',
    icon: <Users className="w-6 h-6" />,
    category: 'ai',
    status: 'active',
    features: ['AI parsing', 'Email validation', 'Role assignment', 'Batch processing'],
    templateUrl: '/templates/trial-users-example.txt',
  },
  {
    id: 'smart-import',
    name: 'Smart Import',
    description: 'Intelligent import of organizations, users, and activities',
    icon: <Sparkles className="w-6 h-6" />,
    category: 'ai',
    status: 'beta',
    features: ['Multi-entity', 'AI parsing', 'Relationship detection', 'Advanced validation'],
  },
  {
    id: 'excel-organizations',
    name: 'Excel Organizations',
    description: 'Import organizations with multiple users from Excel files',
    icon: <Building2 className="w-6 h-6" />,
    category: 'excel',
    status: 'active',
    features: ['Excel import', 'Multi-user support', 'Batch processing', 'Email validation'],
    templateUrl: '/templates/organizations-template.xlsx',
  },
  {
    id: 'timeline-legacy',
    name: 'Timeline Events (Legacy)',
    description: 'Import Circle K format timeline events',
    icon: <Calendar className="w-6 h-6" />,
    category: 'csv',
    status: 'deprecated',
    features: ['CSV import', 'Legacy format', 'Date parsing'],
  },
  {
    id: 'interactive-cli',
    name: 'Interactive CLI',
    description: 'Command-line style interactive data entry',
    icon: <FileText className="w-6 h-6" />,
    category: 'csv',
    status: 'active',
    features: ['Interactive input', 'Real-time validation', 'Quick entry'],
  },
];

// =====================================================
// COMPONENT
// =====================================================

export default function UnifiedImportDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'csv' | 'excel'>('all');

  // Mock stats - in production, fetch from API
  const stats: ImportStats = {
    totalImports: 127,
    successfulImports: 112,
    failedImports: 15,
    recentImports: [
      {
        id: '1',
        tool: 'Feature Requests',
        date: new Date(),
        recordsImported: 234,
        status: 'success',
      },
      {
        id: '2',
        tool: 'Trial Users',
        date: new Date(Date.now() - 3600000),
        recordsImported: 42,
        status: 'success',
      },
      {
        id: '3',
        tool: 'Timeline Events (AI)',
        date: new Date(Date.now() - 7200000),
        recordsImported: 156,
        status: 'partial',
      },
    ],
  };

  const filteredTools =
    selectedCategory === 'all'
      ? IMPORT_TOOLS
      : IMPORT_TOOLS.filter((tool) => tool.category === selectedCategory);

  const successRate = (stats.successfulImports / stats.totalImports) * 100;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Central hub for all data import operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Help & Docs</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Imports</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalImports}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Successful</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.successfulImports}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.failedImports}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{successRate.toFixed(0)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Tools ({IMPORT_TOOLS.length})
        </button>
        <button
          onClick={() => setSelectedCategory('ai')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'ai'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          AI-Powered ({IMPORT_TOOLS.filter((t) => t.category === 'ai').length})
        </button>
        <button
          onClick={() => setSelectedCategory('csv')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'csv'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          CSV ({IMPORT_TOOLS.filter((t) => t.category === 'csv').length})
        </button>
        <button
          onClick={() => setSelectedCategory('excel')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'excel'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Excel ({IMPORT_TOOLS.filter((t) => t.category === 'excel').length})
        </button>
      </div>

      {/* Import Tools Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    tool.category === 'ai'
                      ? 'bg-purple-100 text-purple-600'
                      : tool.category === 'excel'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {tool.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{tool.name}</h3>
                    {tool.status === 'beta' && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        BETA
                      </span>
                    )}
                    {tool.status === 'deprecated' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                        DEPRECATED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{tool.description}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {tool.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              {tool.templateUrl && (
                <a
                  href={tool.templateUrl}
                  download
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Template
                </a>
              )}
              <button
                className="flex-1 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                disabled={tool.status === 'deprecated'}
              >
                Start Import
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Imports</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {stats.recentImports.map((importItem) => (
            <div
              key={importItem.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{importItem.tool}</p>
                  <p className="text-sm text-gray-600">
                    {importItem.recordsImported} records • {importItem.date.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div>
                {importItem.status === 'success' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                    Success
                  </span>
                )}
                {importItem.status === 'partial' && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                    Partial
                  </span>
                )}
                {importItem.status === 'failed' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                    Failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
