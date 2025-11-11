'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Building2, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/utils/errorHandler';

interface LinkedOrg {
  org_id: string;
  org_name: string;
  domain: string;
  link_type: string;
  priority: string;
  notes: string;
}

interface LinkOrgsToRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  roadmapItemId: string;
  roadmapItemTitle: string;
  linkedOrgs: LinkedOrg[];
  onSuccess: () => void;
}

const LINK_TYPES = [
  { value: 'interested', label: 'Interested', description: 'Organization has shown interest in this feature' },
  { value: 'requested', label: 'Requested', description: 'Organization has requested this feature' },
  { value: 'evaluating', label: 'Evaluating', description: 'Organization is evaluating this feature' },
  { value: 'committed', label: 'Committed', description: 'Organization has committed to using this feature' },
  { value: 'using', label: 'Using', description: 'Organization is currently using this feature' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

export default function LinkOrgsToRoadmapModal({
  isOpen,
  onClose,
  roadmapItemId,
  roadmapItemTitle,
  linkedOrgs,
  onSuccess,
}: LinkOrgsToRoadmapModalProps) {
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [linkType, setLinkType] = useState('interested');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableOrgs();
    }
  }, [isOpen]);

  const fetchAvailableOrgs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, domain, status')
        .order('org_name');

      if (error) throw error;
      setAvailableOrgs(data || []);
    } catch (error: any) {
      handleError(error, {
        context: 'fetching organizations for roadmap linking',
        additionalContext: { roadmapItemId }
      });
      toast.error('Failed to load organizations');
      setAvailableOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgs);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const handleLinkOrgs = async () => {
    if (selectedOrgs.size === 0) return;

    setSubmitting(true);
    try {
      // Link each selected organization
      const promises = Array.from(selectedOrgs).map(orgId =>
        supabase.rpc('link_org_to_roadmap', {
          p_roadmap_id: roadmapItemId,
          p_org_id: orgId,
          p_link_type: linkType,
          p_notes: notes || null,
          p_priority: priority,
        })
      );

      await Promise.all(promises);
      toast.success(`Successfully linked ${selectedOrgs.size} organization(s)`);
      onSuccess();
      onClose();

      // Reset form
      setSelectedOrgs(new Set());
      setLinkType('interested');
      setPriority('medium');
      setNotes('');
      setSearchQuery('');
    } catch (error: any) {
      handleError(error, {
        context: 'linking organizations to roadmap',
        additionalContext: {
          roadmapItemId,
          selectedOrgsCount: selectedOrgs.size,
          linkType,
          priority
        }
      });
      toast.error('Failed to link organizations. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkOrg = async (orgId: string) => {
    try {
      const { error } = await supabase.rpc('unlink_org_from_roadmap', {
        p_roadmap_id: roadmapItemId,
        p_org_id: orgId,
      });

      if (error) throw error;
      toast.success('Organization unlinked successfully');
      onSuccess();
    } catch (error: any) {
      handleError(error, {
        context: 'unlinking organization from roadmap',
        additionalContext: { roadmapItemId, orgId }
      });
      toast.error('Failed to unlink organization. Please try again.');
    }
  };

  const filteredOrgs = availableOrgs.filter(org =>
    !linkedOrgs.some(linked => linked.org_id === org.org_id) &&
    (org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     org.domain?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const linkedOrgIds = new Set(linkedOrgs.map(org => org.org_id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Link Organizations to Roadmap Item
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {roadmapItemTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Currently Linked Organizations */}
          {linkedOrgs.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Currently Linked Organizations ({linkedOrgs.length})
              </h4>
              <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {linkedOrgs.map(org => (
                  <div
                    key={org.org_id}
                    className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{org.org_name}</span>
                      </div>
                      {org.domain && (
                        <p className="text-xs text-gray-500 mt-1 ml-6">{org.domain}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 ml-6">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {org.link_type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          PRIORITY_LEVELS.find(p => p.value === org.priority)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {org.priority}
                        </span>
                      </div>
                      {org.notes && (
                        <p className="text-xs text-gray-600 mt-2 ml-6 italic">{org.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlinkOrg(org.org_id)}
                      className="ml-4 text-red-600 hover:text-red-800 transition-colors p-1"
                      title="Remove link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link Settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Link Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Link Type</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LINK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {LINK_TYPES.find(t => t.value === linkType)?.description}
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PRIORITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Context Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why does this organization care about this feature? Any specific requirements?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search Organizations
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or domain..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Available Organizations List */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select Organizations ({selectedOrgs.size} selected)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading organizations...</span>
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No organizations match your search' : 'All organizations are already linked'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredOrgs.map(org => {
                    const isSelected = selectedOrgs.has(org.org_id);
                    return (
                      <button
                        key={org.org_id}
                        onClick={() => handleToggleOrg(org.org_id)}
                        className={`w-full p-4 hover:bg-gray-50 transition-colors flex items-start justify-between text-left ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`mt-1 w-5 h-5 flex items-center justify-center rounded border-2 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <h4 className="font-medium text-gray-900">{org.org_name}</h4>
                            </div>
                            {org.domain && (
                              <p className="text-sm text-gray-500 mt-1">{org.domain}</p>
                            )}
                            <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {org.status || 'Active'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLinkOrgs}
            disabled={selectedOrgs.size === 0 || submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Linking...</span>
              </>
            ) : (
              <span>Link {selectedOrgs.size} Organization{selectedOrgs.size !== 1 ? 's' : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
