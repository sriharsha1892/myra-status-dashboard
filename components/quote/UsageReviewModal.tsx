'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Search,
  DollarSign,
  Calendar,
} from 'lucide-react';

// Types for usage data
interface UsageEntry {
  title: string;
  user: string;
  date: string;
  cost: string;
}

interface UserMapping {
  userName: string;
  orgId: string | null;
  orgName: string | null;
  isInternal: boolean;
  remembered: boolean;
}

interface Organization {
  id: string;
  org_name: string;
  is_internal?: boolean;
}

// Internal organization options
const INTERNAL_ORGS = [
  { id: 'internal-myra', name: 'myRA AI (Internal)', isInternal: true },
  { id: 'internal-mordor', name: 'Mordor Intelligence (Internal)', isInternal: true },
  { id: 'internal-gmi', name: 'GMI (Internal)', isInternal: true },
];

interface UsageReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageEntries: UsageEntry[];
  organizations: Organization[];
  existingMappings: Array<{ user_name: string; org_id: string }>;
  onCommit: (
    entries: UsageEntry[],
    userMappings: UserMapping[]
  ) => Promise<void>;
  isCommitting: boolean;
}

export default function UsageReviewModal({
  isOpen,
  onClose,
  usageEntries,
  organizations,
  existingMappings,
  onCommit,
  isCommitting,
}: UsageReviewModalProps) {
  // Extract unique users
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    usageEntries.forEach((entry) => {
      if (entry.user && entry.user !== 'Unknown') {
        users.add(entry.user);
      }
    });
    return Array.from(users).sort();
  }, [usageEntries]);

  // Initialize user mappings from existing mappings
  const [userMappings, setUserMappings] = useState<Map<string, UserMapping>>(() => {
    const map = new Map<string, UserMapping>();

    uniqueUsers.forEach((userName) => {
      // Check for existing mapping
      const existing = existingMappings.find(
        (m) => m.user_name && m.user_name.toLowerCase() === userName.toLowerCase()
      );

      if (existing) {
        const org = organizations.find((o) => o.id === existing.org_id);
        const internalOrg = INTERNAL_ORGS.find((o) => o.id === existing.org_id);

        map.set(userName, {
          userName,
          orgId: existing.org_id,
          orgName: org?.org_name || internalOrg?.name || null,
          isInternal: !!internalOrg || !!org?.is_internal,
          remembered: true,
        });
      } else {
        // Fuzzy match attempt - ensure org_name exists before calling toLowerCase
        const fuzzyMatch = organizations.find(
          (org) =>
            org.org_name &&
            (org.org_name.toLowerCase().includes(userName.toLowerCase().split(' ')[0]) ||
              userName.toLowerCase().includes(org.org_name.toLowerCase().split(' ')[0]))
        );

        map.set(userName, {
          userName,
          orgId: fuzzyMatch?.id || null,
          orgName: fuzzyMatch?.org_name || null,
          isInternal: false,
          remembered: false,
        });
      }
    });

    return map;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(
    () => new Set(uniqueUsers.filter((u) => !userMappings.get(u)?.orgId))
  );

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return uniqueUsers;
    const term = searchTerm.toLowerCase();
    return uniqueUsers.filter((user) => user.toLowerCase().includes(term));
  }, [uniqueUsers, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const mapped = Array.from(userMappings.values()).filter((m) => m.orgId).length;
    const unmapped = uniqueUsers.length - mapped;
    const internal = Array.from(userMappings.values()).filter((m) => m.isInternal).length;
    const totalCost = usageEntries.reduce((sum, e) => {
      const cost = parseFloat(e.cost.replace('$', '').replace(',', ''));
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    return { mapped, unmapped, internal, totalCost, totalEntries: usageEntries.length };
  }, [userMappings, uniqueUsers, usageEntries]);

  // Handle org selection
  const handleOrgSelect = (userName: string, orgId: string | null, orgName: string | null, isInternal: boolean) => {
    setUserMappings((prev) => {
      const updated = new Map(prev);
      updated.set(userName, {
        userName,
        orgId,
        orgName,
        isInternal,
        remembered: prev.get(userName)?.remembered || false,
      });
      return updated;
    });
  };

  // Handle remember toggle
  const handleRememberToggle = (userName: string) => {
    setUserMappings((prev) => {
      const updated = new Map(prev);
      const current = updated.get(userName);
      if (current) {
        updated.set(userName, { ...current, remembered: !current.remembered });
      }
      return updated;
    });
  };

  // Toggle user expansion
  const toggleUser = (userName: string) => {
    setExpandedUsers((prev) => {
      const updated = new Set(prev);
      if (updated.has(userName)) {
        updated.delete(userName);
      } else {
        updated.add(userName);
      }
      return updated;
    });
  };

  // Check if commit is allowed
  const canCommit = stats.unmapped === 0;

  // Handle commit
  const handleCommit = async () => {
    const mappingsArray = Array.from(userMappings.values());
    await onCommit(usageEntries, mappingsArray);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Review myRA Usage Data</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Map users to organizations before importing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-blue-700">{stats.totalEntries}</strong> conversations
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-purple-700">{uniqueUsers.length}</strong> unique users
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-emerald-700">${stats.totalCost.toFixed(2)}</strong> total cost
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {stats.unmapped > 0 ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.unmapped} unmapped
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
                  <CheckCircle className="w-3 h-3" />
                  All mapped
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-neutral-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No users found matching "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((userName) => {
                const mapping = userMappings.get(userName);
                const isExpanded = expandedUsers.has(userName);
                const userEntries = usageEntries.filter((e) => e.user === userName);
                const userCost = userEntries.reduce((sum, e) => {
                  const cost = parseFloat(e.cost.replace('$', '').replace(',', ''));
                  return sum + (isNaN(cost) ? 0 : cost);
                }, 0);

                return (
                  <div
                    key={userName}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      mapping?.orgId
                        ? mapping.isInternal
                          ? 'border-neutral-200 bg-neutral-50/30'
                          : 'border-emerald-200 bg-emerald-50/30'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    {/* User Header */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/50 transition-colors"
                      onClick={() => toggleUser(userName)}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          mapping?.orgId
                            ? mapping.isInternal
                              ? 'bg-neutral-200 text-neutral-600'
                              : 'bg-emerald-100 text-emerald-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900">{userName}</p>
                        <p className="text-xs text-neutral-500">
                          {userEntries.length} conversations · ${userCost.toFixed(2)}
                        </p>
                      </div>

                      {mapping?.orgName && (
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            mapping.isInternal
                              ? 'bg-neutral-200 text-neutral-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {mapping.orgName}
                        </div>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-neutral-200/50">
                        {/* Org Selection */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-neutral-500 mb-2">
                            <Building className="w-3 h-3 inline mr-1" />
                            Assign to Organization
                          </label>
                          <select
                            value={mapping?.orgId || ''}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (!selectedId) {
                                handleOrgSelect(userName, null, null, false);
                              } else {
                                const internalOrg = INTERNAL_ORGS.find((o) => o.id === selectedId);
                                if (internalOrg) {
                                  handleOrgSelect(userName, selectedId, internalOrg.name, true);
                                } else {
                                  const org = organizations.find((o) => o.id === selectedId);
                                  handleOrgSelect(userName, selectedId, org?.org_name || null, false);
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 text-sm border rounded-lg ${
                              mapping?.orgId
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-amber-300 bg-amber-50'
                            }`}
                          >
                            <option value="">-- Select Organization --</option>
                            <optgroup label="Internal Teams">
                              {INTERNAL_ORGS.map((org) => (
                                <option key={org.id} value={org.id}>
                                  {org.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Client Organizations">
                              {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                  {org.org_name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Remember Mapping */}
                        {mapping?.orgId && (
                          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mapping.remembered}
                              onChange={() => handleRememberToggle(userName)}
                              className="rounded border-neutral-300"
                            />
                            Remember this mapping for future syncs
                          </label>
                        )}

                        {/* Recent Conversations */}
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                          <p className="text-xs font-medium text-neutral-500 mb-2">
                            Recent Conversations:
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {userEntries.slice(0, 5).map((entry, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs px-2 py-1 bg-white rounded border border-neutral-100"
                              >
                                <span className="truncate max-w-[60%] text-neutral-700">
                                  {entry.title || 'Untitled Conversation'}
                                </span>
                                <span className="text-neutral-400">{entry.date}</span>
                                <span className="font-medium text-neutral-600">{entry.cost}</span>
                              </div>
                            ))}
                            {userEntries.length > 5 && (
                              <p className="text-xs text-neutral-400 text-center">
                                +{userEntries.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span>
                <strong className="text-emerald-700">{stats.mapped}</strong> mapped
              </span>
              <span>
                <strong className="text-neutral-400">{stats.internal}</strong> internal
              </span>
              {stats.unmapped > 0 && (
                <span className="text-amber-600">
                  <strong>{stats.unmapped}</strong> need assignment
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={isCommitting || !canCommit}
                title={!canCommit ? 'All users must be mapped to an organization' : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Import Usage Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
