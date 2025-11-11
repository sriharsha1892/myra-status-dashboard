'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Crown, Users, Eye, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/utils/errorHandler';

interface Owner {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  role: 'primary' | 'contributor' | 'reviewer';
}

interface OwnerManagerProps {
  orgId?: string | null; // Optional to support global roadmap items (org_id = NULL)
  roadmapItemId: string;
  onOwnersChange?: () => void;
}

const ADMIN_LIST = [
  { name: 'Harsha', email: 'admin@myra.ai' },
  { name: 'Reddy', email: 'reddy@myra.ai' },
  { name: 'Sai Teja', email: 'saiteja@myra.ai' },
  { name: 'Abin Zacharia', email: 'abin@myra.ai' },
];

const ROLE_CONFIG = {
  primary: {
    label: 'Primary Owner',
    icon: Crown,
    color: 'bg-accent-100 text-accent-700 border-purple-300',
    description: 'Main person responsible for this item',
  },
  contributor: {
    label: 'Contributor',
    icon: Users,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    description: 'Co-owner who contributes to this item',
  },
  reviewer: {
    label: 'Reviewer',
    icon: Eye,
    color: 'bg-green-100 text-green-700 border-green-300',
    description: 'Provides oversight and review',
  },
};

export default function OwnerManager({ orgId, roadmapItemId, onOwnersChange }: OwnerManagerProps) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newOwner, setNewOwner] = useState({
    user_name: '',
    user_email: '',
    role: 'contributor' as 'primary' | 'contributor' | 'reviewer',
  });

  const supabase = createClient();

  useEffect(() => {
    fetchOwners();
  }, [orgId, roadmapItemId]);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      if (!roadmapItemId) {
        console.warn('OwnerManager: Missing roadmapItemId');
        setOwners([]);
        return;
      }

      // Build query - handle both org-specific and global roadmap items
      let query = supabase
        .from('roadmap_owner_assignments')
        .select('*')
        .eq('roadmap_item_id', roadmapItemId);

      // For org-specific items, filter by org_id
      // For global items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else {
        query = query.is('org_id', null);
      }

      query = query.order('role', { ascending: true }); // primary first, then contributor, then reviewer

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error fetching owners:', error);
        throw error;
      }
      setOwners(data || []);
    } catch (error: any) {
      console.error('Caught error in fetchOwners:', error);
      handleError(error, {
        context: 'fetching roadmap owners',
        additionalContext: { orgId, roadmapItemId }
      });
      // Don't re-throw - just log it
      setOwners([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const addOwner = async () => {
    if (!newOwner.user_name.trim()) {
      toast.error('Owner name is required');
      return;
    }

    // Validate required roadmap item ID
    if (!roadmapItemId) {
      toast.error('Missing roadmap item ID');
      return;
    }

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Use the RPC function to handle primary owner logic
      // Pass orgId as null for global items
      const { data, error } = await supabase.rpc('assign_roadmap_owner', {
        p_org_id: orgId && orgId !== 'null' && orgId !== 'undefined' ? orgId : null,
        p_roadmap_id: roadmapItemId,
        p_user_name: newOwner.user_name.trim(),
        p_user_email: newOwner.user_email.trim() || null,
        p_role: newOwner.role,
      });

      if (error) throw error;

      toast.success(`Owner assigned as ${ROLE_CONFIG[newOwner.role].label}`);
      setNewOwner({ user_name: '', user_email: '', role: 'contributor' });
      setShowAddForm(false);
      fetchOwners();
      onOwnersChange?.();
    } catch (error: any) {
      handleError(error, {
        context: 'assigning roadmap owner',
        additionalContext: { orgId, roadmapItemId, role: newOwner.role }
      });
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (ownerId: string, userId: string, newRole: 'primary' | 'contributor' | 'reviewer') => {
    try {
      const { error } = await supabase.rpc('change_roadmap_owner_role', {
        p_org_id: orgId && orgId !== 'null' && orgId !== 'undefined' ? orgId : null,
        p_roadmap_id: roadmapItemId,
        p_user_id: userId,
        p_new_role: newRole,
      });

      if (error) throw error;

      toast.success(`Role changed to ${ROLE_CONFIG[newRole].label}`);
      fetchOwners();
      onOwnersChange?.();
    } catch (error: any) {
      handleError(error, {
        context: 'changing owner role',
        additionalContext: { orgId, roadmapItemId, userId, newRole }
      });
    }
  };

  const removeOwner = async (ownerId: string, ownerName: string, userId: string) => {
    if (!confirm(`Remove ${ownerName} from this roadmap item?`)) return;

    try {
      const { error } = await supabase.rpc('remove_roadmap_owner', {
        p_org_id: orgId && orgId !== 'null' && orgId !== 'undefined' ? orgId : null,
        p_roadmap_id: roadmapItemId,
        p_user_id: userId,
      });

      if (error) throw error;

      toast.success('Owner removed');
      fetchOwners();
      onOwnersChange?.();
    } catch (error: any) {
      handleError(error, {
        context: 'removing owner',
        additionalContext: { orgId, roadmapItemId, userId, ownerName }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const primaryOwner = owners.find(o => o.role === 'primary');
  const otherOwners = owners.filter(o => o.role !== 'primary');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">Owners & Contributors</label>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Owner
        </button>
      </div>

      {/* Add Owner Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Select Admin *</label>
            <select
              value={newOwner.user_name}
              onChange={(e) => {
                const selectedAdmin = ADMIN_LIST.find(admin => admin.name === e.target.value);
                setNewOwner({
                  ...newOwner,
                  user_name: e.target.value,
                  user_email: selectedAdmin?.email || '',
                });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select an admin --</option>
              {ADMIN_LIST.map((admin) => (
                <option key={admin.name} value={admin.name}>
                  {admin.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Role *</label>
            <div className="space-y-2">
              {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map((roleKey) => {
                const role = ROLE_CONFIG[roleKey];
                const Icon = role.icon;
                return (
                  <label
                    key={roleKey}
                    className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                      newOwner.role === roleKey
                        ? role.color
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={roleKey}
                      checked={newOwner.role === roleKey}
                      onChange={(e) => setNewOwner({ ...newOwner, role: e.target.value as any })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{role.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{role.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addOwner}
              disabled={adding}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Owner'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewOwner({ user_name: '', user_email: '', role: 'contributor' });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Primary Owner */}
      {primaryOwner && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-accent-600" />
              <span className="text-xs font-semibold text-purple-900">PRIMARY OWNER</span>
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{primaryOwner.user_name}</p>
            </div>
            <button
              onClick={() => removeOwner(primaryOwner.id, primaryOwner.user_name, primaryOwner.user_id || primaryOwner.user_name)}
              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Remove owner"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Other Owners */}
      {otherOwners.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">
            {otherOwners.length} {otherOwners.length === 1 ? 'Co-owner' : 'Co-owners'}
          </p>
          {otherOwners.map((owner) => {
            const roleConfig = ROLE_CONFIG[owner.role];
            const RoleIcon = roleConfig.icon;

            return (
              <div
                key={owner.id}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900">{owner.user_name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${roleConfig.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </span>
                    </div>

                    {/* Role Change Dropdown */}
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={owner.role}
                        onChange={(e) => changeRole(owner.id, owner.user_id || owner.user_name, e.target.value as any)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="primary">↑ Promote to Primary</option>
                        <option value="contributor">Contributor</option>
                        <option value="reviewer">Reviewer</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => removeOwner(owner.id, owner.user_name, owner.user_id || owner.user_name)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove owner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {owners.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No owners assigned yet</p>
          <p className="text-xs mt-1">Add an owner to track responsibility</p>
        </div>
      )}
    </div>
  );
}
