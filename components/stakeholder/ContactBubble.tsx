'use client';

import { useState } from 'react';
import { Mail, Phone, Linkedin, Crown, Shield, Target, UserCheck, Users, User, ExternalLink, Activity } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface ContactBubbleProps {
  contact: {
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
  };
  size?: 'sm' | 'md' | 'lg';
  onViewActivity?: (contactId: string) => void;
  highlighted?: boolean;
}

const INFLUENCE_CONFIG: Record<string, {
  icon: typeof Crown;
  color: string;
  bg: string;
  ring: string;
  label: string;
  description: string;
}> = {
  champion: {
    icon: Crown,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    ring: 'ring-amber-300',
    label: 'Champion',
    description: 'Strong advocate who actively supports your solution'
  },
  decision_maker: {
    icon: Shield,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    ring: 'ring-purple-300',
    label: 'Decision Maker',
    description: 'Has authority to approve or reject the purchase'
  },
  blocker: {
    icon: Target,
    color: 'text-red-600',
    bg: 'bg-red-100',
    ring: 'ring-red-300',
    label: 'Blocker',
    description: 'May oppose or delay the deal'
  },
  evaluator: {
    icon: UserCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    ring: 'ring-blue-300',
    label: 'Evaluator',
    description: 'Assesses the solution for technical or business fit'
  },
  influencer: {
    icon: Users,
    color: 'text-green-600',
    bg: 'bg-green-100',
    ring: 'ring-green-300',
    label: 'Influencer',
    description: 'Can influence the decision but not make it alone'
  },
  unknown: {
    icon: User,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    ring: 'ring-gray-300',
    label: 'Unknown',
    description: 'Role in decision-making is unclear'
  },
};

const SIZE_CONFIG = {
  sm: {
    bubble: 'w-16 h-16',
    avatar: 'sm' as const,
    icon: 'w-3 h-3',
    text: 'text-[10px]',
    badge: 'w-5 h-5',
    tooltip: 'w-48',
  },
  md: {
    bubble: 'w-24 h-24',
    avatar: 'md' as const,
    icon: 'w-4 h-4',
    text: 'text-xs',
    badge: 'w-6 h-6',
    tooltip: 'w-56',
  },
  lg: {
    bubble: 'w-32 h-32',
    avatar: 'lg' as const,
    icon: 'w-5 h-5',
    text: 'text-sm',
    badge: 'w-7 h-7',
    tooltip: 'w-64',
  },
};

export default function ContactBubble({
  contact,
  size = 'md',
  onViewActivity,
  highlighted = false,
}: ContactBubbleProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = INFLUENCE_CONFIG[contact.influence] || INFLUENCE_CONFIG.unknown;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const getEngagementColor = (score?: number) => {
    if (!score) return 'bg-gray-200';
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Bubble */}
      <div
        className={`
          ${sizeConfig.bubble} rounded-full flex flex-col items-center justify-center
          ${config.bg} ${highlighted ? `ring-4 ${config.ring}` : 'ring-2 ring-white'}
          shadow-md hover:shadow-lg transition-all cursor-pointer group
          hover:scale-110 hover:z-10
        `}
      >
        <Avatar name={contact.name} size={sizeConfig.avatar} />
        <p className={`${sizeConfig.text} font-medium text-gray-900 mt-1 text-center truncate px-1 max-w-full`}>
          {contact.name.split(' ')[0]}
        </p>
      </div>

      {/* Influence Badge */}
      <div
        className={`
          absolute -top-1 -right-1 ${sizeConfig.badge} rounded-full
          ${config.bg} flex items-center justify-center shadow-sm border-2 border-white
        `}
        title={config.label}
      >
        <Icon className={`${sizeConfig.icon} ${config.color}`} />
      </div>

      {/* Primary Contact Star */}
      {contact.is_primary_contact && (
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm border-2 border-white">
          <Crown className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Engagement Indicator */}
      {contact.engagement_score !== undefined && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-0.5">
            <div className={`w-2 h-2 rounded-full ${getEngagementColor(contact.engagement_score)}`} />
            <span className="text-[10px] text-gray-500">{contact.engagement_score}%</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className={`
          absolute z-50 ${sizeConfig.tooltip} bg-white rounded-xl shadow-xl border border-gray-200
          p-4 left-1/2 transform -translate-x-1/2 mt-2 top-full
        `}>
          {/* Tooltip Arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-200" />

          <div className="relative space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <Avatar name={contact.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{contact.name}</p>
                <p className="text-xs text-gray-500 truncate">{contact.title}</p>
              </div>
            </div>

            {/* Influence Badge */}
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${config.bg}`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
              <div>
                <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                <p className="text-[10px] text-gray-500">{config.description}</p>
              </div>
            </div>

            {/* Contact Actions */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title={contact.email}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-4 h-4 text-gray-500" />
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title={contact.phone}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-4 h-4 text-gray-500" />
                </a>
              )}
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="w-4 h-4 text-gray-500" />
                </a>
              )}
              {onViewActivity && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewActivity(contact.id);
                  }}
                  className="ml-auto p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                  title="View activity"
                >
                  <Activity className="w-4 h-4 text-blue-500" />
                </button>
              )}
            </div>

            {/* Last Activity */}
            {contact.last_activity && (
              <p className="text-[10px] text-gray-400 text-center">
                Last activity: {contact.last_activity}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
