'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ContactBubble from './ContactBubble';
import { Users, Plus, Crown, Shield, Target, UserCheck, User, RefreshCcw, Filter } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  title: string;
  phone?: string;
  linkedin_url?: string;
  is_primary_contact: boolean;
  influence: 'champion' | 'blocker' | 'decision_maker' | 'evaluator' | 'influencer' | 'unknown';
  engagement_score?: number;
  last_activity?: string;
}

interface StakeholderMapProps {
  orgId: string;
  onAddContact?: () => void;
  onViewContactActivity?: (contactId: string) => void;
}

const INFLUENCE_TIERS = [
  {
    id: 'champion',
    label: 'Champions',
    description: 'Strong advocates',
    icon: Crown,
    color: 'text-amber-600',
    bg: 'from-amber-50 to-amber-100',
    borderColor: 'border-amber-200',
  },
  {
    id: 'decision_maker',
    label: 'Decision Makers',
    description: 'Final authority',
    icon: Shield,
    color: 'text-purple-600',
    bg: 'from-purple-50 to-purple-100',
    borderColor: 'border-purple-200',
  },
  {
    id: 'influencer',
    label: 'Influencers',
    description: 'Key influence',
    icon: Users,
    color: 'text-green-600',
    bg: 'from-green-50 to-green-100',
    borderColor: 'border-green-200',
  },
  {
    id: 'evaluator',
    label: 'Evaluators',
    description: 'Technical assessment',
    icon: UserCheck,
    color: 'text-blue-600',
    bg: 'from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
  },
  {
    id: 'blocker',
    label: 'Blockers',
    description: 'Potential resistance',
    icon: Target,
    color: 'text-red-600',
    bg: 'from-red-50 to-red-100',
    borderColor: 'border-red-200',
  },
  {
    id: 'unknown',
    label: 'Unknown Role',
    description: 'Needs classification',
    icon: User,
    color: 'text-gray-600',
    bg: 'from-gray-50 to-gray-100',
    borderColor: 'border-gray-200',
  },
];

export default function StakeholderMap({
  orgId,
  onAddContact,
  onViewContactActivity,
}: StakeholderMapProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tiered' | 'circular'>('tiered');
  const [filterInfluence, setFilterInfluence] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchContacts();
  }, [orgId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Fetch from prospects table
      const { data: prospects } = await supabase
        .from('prospects')
        .select('id, name, email, title, phone, linkedin_url, is_primary_contact, status, influence')
        .eq('org_id', orgId);

      // Fetch trial users
      const { data: users } = await supabase
        .from('trial_users')
        .select('user_id, name, email, role, phone, linkedin_url, influence, is_primary_contact, engagement_score')
        .eq('org_id', orgId);

      // Map trial users to contact format
      const mappedUsers = (users || []).map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        title: u.role || 'User',
        phone: u.phone,
        linkedin_url: u.linkedin_url,
        is_primary_contact: u.is_primary_contact || false,
        influence: (u.influence || 'unknown') as Contact['influence'],
        engagement_score: u.engagement_score,
      }));

      // Map prospects
      const mappedProspects = (prospects || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        title: p.title || 'Contact',
        phone: p.phone,
        linkedin_url: p.linkedin_url,
        is_primary_contact: p.is_primary_contact || false,
        influence: (p.influence || 'unknown') as Contact['influence'],
      }));

      // Combine and deduplicate by email
      const combined = [...mappedUsers, ...mappedProspects].reduce((acc, contact) => {
        if (!acc.find(c => c.email === contact.email)) {
          acc.push(contact);
        }
        return acc;
      }, [] as Contact[]);

      setContacts(combined);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group contacts by influence
  const groupedContacts = contacts.reduce((acc, contact) => {
    const influence = contact.influence || 'unknown';
    if (!acc[influence]) acc[influence] = [];
    acc[influence].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  // Filter contacts if filter is applied
  const filteredTiers = filterInfluence
    ? INFLUENCE_TIERS.filter(t => t.id === filterInfluence)
    : INFLUENCE_TIERS;

  // Calculate stats
  const stats = {
    total: contacts.length,
    champions: groupedContacts.champion?.length || 0,
    blockers: groupedContacts.blocker?.length || 0,
    unclassified: groupedContacts.unknown?.length || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stakeholder Map</h3>
          <p className="text-sm text-gray-500">
            Visualize key contacts and their influence on the deal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filterInfluence || ''}
              onChange={(e) => setFilterInfluence(e.target.value || null)}
              className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">All Roles</option>
              {INFLUENCE_TIERS.map(tier => (
                <option key={tier.id} value={tier.id}>{tier.label}</option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <button
            onClick={fetchContacts}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 text-gray-600" />
          </button>

          {onAddContact && (
            <button
              onClick={onAddContact}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Contacts</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Champions</p>
              <p className="text-xl font-bold text-gray-900">{stats.champions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Blockers</p>
              <p className="text-xl font-bold text-gray-900">{stats.blockers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Unclassified</p>
              <p className="text-xl font-bold text-gray-900">{stats.unclassified}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stakeholder Map */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-gray-900 font-medium mb-1">No stakeholders mapped</h4>
          <p className="text-gray-500 text-sm mb-4">Start by adding contacts and classifying their influence</p>
          {onAddContact && (
            <button
              onClick={onAddContact}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Contact
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tiered View */}
          {filteredTiers.map((tier) => {
            const tierContacts = groupedContacts[tier.id] || [];
            if (tierContacts.length === 0 && filterInfluence) {
              return (
                <div key={tier.id} className="text-center py-8 text-gray-500">
                  No contacts with {tier.label} role
                </div>
              );
            }
            if (tierContacts.length === 0) return null;

            const Icon = tier.icon;

            return (
              <div
                key={tier.id}
                className={`
                  bg-gradient-to-r ${tier.bg} rounded-2xl border ${tier.borderColor}
                  p-6 transition-all hover:shadow-md
                `}
              >
                {/* Tier Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${tier.bg.replace('to-', 'to-').replace('from-', 'bg-')} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${tier.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{tier.label}</h4>
                    <p className="text-xs text-gray-500">{tier.description}</p>
                  </div>
                  <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${tier.bg.replace('from-', 'bg-').replace(' to-', '')} ${tier.color}`}>
                    {tierContacts.length} contact{tierContacts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Contacts Grid */}
                <div className="flex flex-wrap gap-6 justify-start">
                  {tierContacts.map((contact) => (
                    <ContactBubble
                      key={contact.id}
                      contact={contact}
                      size="md"
                      onViewActivity={onViewContactActivity}
                      highlighted={contact.is_primary_contact}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Role Legend</h5>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {INFLUENCE_TIERS.map((tier) => {
            const Icon = tier.icon;
            const count = groupedContacts[tier.id]?.length || 0;

            return (
              <button
                key={tier.id}
                onClick={() => setFilterInfluence(filterInfluence === tier.id ? null : tier.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left
                  ${filterInfluence === tier.id ? `${tier.bg.replace('from-', 'bg-').split(' ')[0]} ring-2 ring-offset-1 ${tier.borderColor.replace('border', 'ring')}` : 'hover:bg-gray-50'}
                `}
              >
                <Icon className={`w-4 h-4 ${tier.color}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{tier.label}</p>
                  <p className="text-[10px] text-gray-500">{count}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
