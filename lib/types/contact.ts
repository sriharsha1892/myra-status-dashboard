/**
 * Contact Types
 * Contacts linked to organizations with role + lifecycle tracking
 */

// Contact's role in the deal (what they do)
export type ContactRole =
  | 'champion'           // Internal advocate pushing for the deal
  | 'decision_maker'     // Has budget authority
  | 'blocker'            // Opposing or blocking the deal
  | 'evaluator'          // Technical evaluator
  | 'influencer'         // Influences decision without authority
  | 'user'               // End user of the product
  | 'billing'            // Procurement/billing contact
  | 'executive_sponsor'; // C-level sponsor

// Contact's lifecycle stage (where they are in the journey)
export type ContactLifecycle =
  | 'prospect'           // Pre-engagement
  | 'demo_scheduled'     // Demo meeting booked
  | 'demo_attended'      // Attended demo
  | 'trial_invited'      // Invited to trial
  | 'trial_active'       // Actively using trial
  | 'trial_ended'        // Trial period ended
  | 'customer'           // Paying customer
  | 'churned'            // Former customer
  | 'inactive';          // No longer engaged

// Engagement level
export type EngagementLevel = 'high' | 'medium' | 'low' | 'none' | 'unknown';

// Preferred contact method
export type ContactMethod = 'email' | 'phone' | 'linkedin' | 'slack' | 'whatsapp';

/**
 * Organization Contact - main data type
 */
export interface OrgContact {
  id: string;

  // Relationships
  org_id: string;
  platform_user_id: string | null;  // Links to trial_users when they have product access

  // Identity
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;

  // Role & Lifecycle (both tracked)
  role: ContactRole;
  lifecycle_stage: ContactLifecycle;

  // Flags
  is_primary: boolean;
  is_billing: boolean;
  is_advocate: boolean;
  is_decision_influencer: boolean;

  // Engagement tracking
  engagement_level: EngagementLevel | null;
  last_contacted_at: string | null;
  last_responded_at: string | null;
  preferred_contact_method: ContactMethod | null;

  // Notes
  notes: string | null;

  // Metadata
  source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Contact activity types
 */
export type ActivityType =
  | 'email_sent'
  | 'email_received'
  | 'call_made'
  | 'call_received'
  | 'meeting_scheduled'
  | 'meeting_held'
  | 'meeting_cancelled'
  | 'demo_scheduled'
  | 'demo_held'
  | 'note_added'
  | 'linkedin_message'
  | 'whatsapp_message'
  | 'trial_invited'
  | 'trial_started'
  | 'contract_sent'
  | 'contract_signed'
  | 'stage_changed'
  | 'task_completed'
  | 'follow_up_set';

// Response status for activities
export type ResponseStatus = 'pending' | 'positive' | 'negative' | 'neutral' | 'no_response';

/**
 * Contact Activity Log
 */
export interface ContactActivity {
  id: string;

  // Relationships
  contact_id: string | null;
  org_id: string;

  // Activity details
  activity_type: ActivityType;
  subject: string | null;
  content: string | null;

  // Response tracking
  response_status: ResponseStatus | null;

  // Scheduling
  scheduled_at: string | null;
  completed_at: string | null;

  // Metadata
  logged_by: string | null;
  activity_date: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Role configuration for UI display
 */
export const ROLE_CONFIG: Record<ContactRole, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  champion: {
    label: 'Champion',
    icon: 'Crown',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Internal advocate pushing for the deal',
  },
  decision_maker: {
    label: 'Decision Maker',
    icon: 'Shield',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Has budget authority',
  },
  blocker: {
    label: 'Blocker',
    icon: 'AlertTriangle',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Opposing or blocking the deal',
  },
  evaluator: {
    label: 'Evaluator',
    icon: 'Search',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Technical evaluator',
  },
  influencer: {
    label: 'Influencer',
    icon: 'Users',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Influences decision without authority',
  },
  user: {
    label: 'User',
    icon: 'User',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'End user of the product',
  },
  billing: {
    label: 'Billing',
    icon: 'CreditCard',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description: 'Procurement/billing contact',
  },
  executive_sponsor: {
    label: 'Exec Sponsor',
    icon: 'Star',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'C-level sponsor',
  },
};

/**
 * Lifecycle configuration for UI display
 */
export const LIFECYCLE_CONFIG: Record<ContactLifecycle, {
  label: string;
  color: string;
  bgColor: string;
  step: number;  // For progress indicator
}> = {
  prospect: { label: 'Prospect', color: 'text-gray-600', bgColor: 'bg-gray-100', step: 1 },
  demo_scheduled: { label: 'Demo Scheduled', color: 'text-blue-600', bgColor: 'bg-blue-100', step: 2 },
  demo_attended: { label: 'Demo Attended', color: 'text-blue-700', bgColor: 'bg-blue-200', step: 3 },
  trial_invited: { label: 'Trial Invited', color: 'text-yellow-600', bgColor: 'bg-yellow-100', step: 4 },
  trial_active: { label: 'Trial Active', color: 'text-emerald-600', bgColor: 'bg-emerald-100', step: 5 },
  trial_ended: { label: 'Trial Ended', color: 'text-orange-600', bgColor: 'bg-orange-100', step: 6 },
  customer: { label: 'Customer', color: 'text-green-700', bgColor: 'bg-green-100', step: 7 },
  churned: { label: 'Churned', color: 'text-red-600', bgColor: 'bg-red-100', step: 8 },
  inactive: { label: 'Inactive', color: 'text-slate-500', bgColor: 'bg-slate-100', step: 0 },
};

/**
 * Activity type configuration for UI display
 */
export const ACTIVITY_CONFIG: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
}> = {
  email_sent: { label: 'Email Sent', icon: 'Mail', color: 'text-blue-500' },
  email_received: { label: 'Email Received', icon: 'MailOpen', color: 'text-blue-600' },
  call_made: { label: 'Call Made', icon: 'Phone', color: 'text-green-500' },
  call_received: { label: 'Call Received', icon: 'PhoneIncoming', color: 'text-green-600' },
  meeting_scheduled: { label: 'Meeting Scheduled', icon: 'Calendar', color: 'text-purple-500' },
  meeting_held: { label: 'Meeting Held', icon: 'Users', color: 'text-purple-600' },
  meeting_cancelled: { label: 'Meeting Cancelled', icon: 'CalendarX', color: 'text-red-400' },
  demo_scheduled: { label: 'Demo Scheduled', icon: 'Presentation', color: 'text-indigo-500' },
  demo_held: { label: 'Demo Held', icon: 'Presentation', color: 'text-indigo-600' },
  note_added: { label: 'Note Added', icon: 'FileText', color: 'text-gray-500' },
  linkedin_message: { label: 'LinkedIn Message', icon: 'Linkedin', color: 'text-blue-700' },
  whatsapp_message: { label: 'WhatsApp Message', icon: 'MessageCircle', color: 'text-green-500' },
  trial_invited: { label: 'Trial Invited', icon: 'UserPlus', color: 'text-amber-500' },
  trial_started: { label: 'Trial Started', icon: 'Play', color: 'text-emerald-500' },
  contract_sent: { label: 'Contract Sent', icon: 'FileSignature', color: 'text-orange-500' },
  contract_signed: { label: 'Contract Signed', icon: 'CheckCircle', color: 'text-green-600' },
  stage_changed: { label: 'Stage Changed', icon: 'ArrowRight', color: 'text-purple-500' },
  task_completed: { label: 'Task Completed', icon: 'CheckSquare', color: 'text-green-500' },
  follow_up_set: { label: 'Follow-up Set', icon: 'Clock', color: 'text-yellow-500' },
};

/**
 * Engagement level display config
 */
export const ENGAGEMENT_CONFIG: Record<EngagementLevel, {
  label: string;
  color: string;
  bgColor: string;
  barColor: string;
  percentage: number;
}> = {
  high: { label: 'High', color: 'text-green-700', bgColor: 'bg-green-100', barColor: 'bg-green-500', percentage: 100 },
  medium: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100', barColor: 'bg-yellow-500', percentage: 66 },
  low: { label: 'Low', color: 'text-orange-700', bgColor: 'bg-orange-100', barColor: 'bg-orange-500', percentage: 33 },
  none: { label: 'None', color: 'text-red-700', bgColor: 'bg-red-100', barColor: 'bg-red-500', percentage: 0 },
  unknown: { label: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100', barColor: 'bg-gray-300', percentage: 0 },
};

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get avatar color based on name (consistent color per name)
 */
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
