'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, Crown, Shield, Target, UserCheck, User, Mail, Phone, Linkedin, ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface Contact {
  id: string;
  name: string;
  email: string;
  title: string;
  phone?: string;
  linkedin_url?: string;
  is_primary_contact: boolean;
  influence?: 'champion' | 'blocker' | 'decision_maker' | 'evaluator' | 'influencer' | 'unknown';
  status: string;
}

interface ContactsSidebarProps {
  orgId: string;
  onAddContact?: () => void;
}

const INFLUENCE_CONFIG: Record<string, { icon: typeof Crown; color: string; bg: string; label: string }> = {
  champion: { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Champion' },
  decision_maker: { icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Decision Maker' },
  blocker: { icon: Target, color: 'text-red-600', bg: 'bg-red-100', label: 'Blocker' },
  evaluator: { icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Evaluator' },
  influencer: { icon: Users, color: 'text-green-600', bg: 'bg-green-100', label: 'Influencer' },
  unknown: { icon: User, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' },
};

export default function ContactsSidebar({ orgId, onAddContact }: ContactsSidebarProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [trialUsers, setTrialUsers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
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
        .select('id, name, email, title, phone, linkedin_url, is_primary_contact, status')
        .eq('org_id', orgId)
        .order('is_primary_contact', { ascending: false });

      // Fetch trial users with influence
      const { data: users } = await supabase
        .from('trial_users')
        .select('user_id, name, email, role, phone, influence, is_primary_contact')
        .eq('org_id', orgId)
        .order('is_primary_contact', { ascending: false });

      // Map trial users to contact format
      const mappedUsers = (users || []).map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        title: u.role || 'User',
        phone: u.phone,
        is_primary_contact: u.is_primary_contact,
        influence: u.influence || 'unknown',
        status: 'active',
      }));

      setContacts(prospects || []);
      setTrialUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combine and deduplicate by email
  const allContacts = [...contacts, ...trialUsers].reduce((acc, contact) => {
    if (!acc.find(c => c.email === contact.email)) {
      acc.push(contact);
    }
    return acc;
  }, [] as Contact[]);

  // Group by influence
  const groupedContacts = allContacts.reduce((acc, contact) => {
    const influence = contact.influence || 'unknown';
    if (!acc[influence]) acc[influence] = [];
    acc[influence].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  // Priority order for display
  const influenceOrder = ['champion', 'decision_maker', 'evaluator', 'influencer', 'blocker', 'unknown'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Contacts</h3>
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {allContacts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onAddContact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddContact();
              }}
              className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
              title="Add contact"
            >
              <Plus className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : allContacts.length === 0 ? (
            <div className="text-center py-4">
              <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No contacts yet</p>
              {onAddContact && (
                <button
                  onClick={onAddContact}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add first contact
                </button>
              )}
            </div>
          ) : (
            influenceOrder.map(influence => {
              const contactsInGroup = groupedContacts[influence] || [];
              if (contactsInGroup.length === 0) return null;

              const config = INFLUENCE_CONFIG[influence];
              const Icon = config.icon;

              return (
                <div key={influence} className="space-y-2">
                  {/* Influence Group Header */}
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3 h-3 ${config.color}`} />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {config.label}
                    </span>
                  </div>

                  {/* Contacts in Group */}
                  {contactsInGroup.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <Avatar name={contact.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contact.name}
                          </p>
                          {contact.is_primary_contact && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{contact.title}</p>

                        {/* Contact actions - show on hover */}
                        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="p-1 hover:bg-gray-100 rounded"
                              title={contact.email}
                            >
                              <Mail className="w-3 h-3 text-gray-400" />
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="p-1 hover:bg-gray-100 rounded"
                              title={contact.phone}
                            >
                              <Phone className="w-3 h-3 text-gray-400" />
                            </a>
                          )}
                          {contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-100 rounded"
                              title="LinkedIn"
                            >
                              <Linkedin className="w-3 h-3 text-gray-400" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
