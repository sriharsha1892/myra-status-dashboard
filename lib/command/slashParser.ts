/**
 * Slash Command Parser
 * Parses slash command shortcuts like /log, /org, /ticket
 * Falls back to natural language parser for complex inputs
 */

import type {
  ParsedCommand,
  CommandAction,
  ActivityType,
  LifecycleStage,
  TicketPriority,
  TicketCategory,
  FeatureRequestPriority,
  TimelineEventType,
  DomainCategory,
  RoadmapItemStatus,
  RoadmapItemPriority,
} from './types';

// Slash command definitions
interface SlashCommandDef {
  action: CommandAction;
  aliases: string[];
  usage: string;
  example: string;
  parseArgs: (args: string) => Partial<ParsedCommand['fields']> & {
    org_name?: string;
    user_name?: string;
  };
}

// Activity type mapping for /log command
const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  'query': 'query',
  'ran': 'query',
  'executed': 'query',
  'login': 'login',
  'logged in': 'login',
  'demo': 'demo',
  'call': 'call',
  'called': 'call',
  'email': 'email',
  'emailed': 'email',
  'meeting': 'meeting',
  'met': 'meeting',
  'feature': 'feature_usage',
  'used': 'feature_usage',
  'feedback': 'feedback',
  'support': 'support_request',
  // New activity types
  'check_in': 'check_in',
  'checkin': 'check_in',
  'check-in': 'check_in',
  'follow_up': 'follow_up',
  'followup': 'follow_up',
  'follow-up': 'follow_up',
  'training': 'training',
  'trained': 'training',
  'onboarding': 'onboarding',
  'onboard': 'onboarding',
  'presentation': 'presentation',
  'presented': 'presentation',
  'poc': 'poc',
  'negotiation': 'negotiation',
  'negotiated': 'negotiation',
};

// Stage mapping for /stage command
const STAGE_MAP: Record<string, LifecycleStage> = {
  'prospect': 'prospect',
  'pending': 'trial_pending',
  'trial_pending': 'trial_pending',
  'active': 'trial_active',
  'trial_active': 'trial_active',
  'expired': 'trial_expired',
  'trial_expired': 'trial_expired',
  'customer': 'customer',
  'won': 'customer',
  'converted': 'customer',
  'lost': 'lost',
  'churned': 'lost',
};

// Priority mapping
const PRIORITY_MAP: Record<string, TicketPriority> = {
  'low': 'low',
  'medium': 'medium',
  'med': 'medium',
  'high': 'high',
  'critical': 'critical',
  'urgent': 'critical',
  'p1': 'critical',
  'p2': 'high',
  'p3': 'medium',
  'p4': 'low',
};

// Category mapping for tickets
const CATEGORY_MAP: Record<string, TicketCategory> = {
  'bug': 'bug',
  'feature': 'feature_request',
  'question': 'question',
  'integration': 'integration',
  'perf': 'performance',
  'performance': 'performance',
  'security': 'security',
  'docs': 'documentation',
  'documentation': 'documentation',
};

// Event type mapping
const EVENT_TYPE_MAP: Record<string, TimelineEventType> = {
  'query': 'query_executed',
  'login': 'user_logged_in',
  'demo': 'demo_conducted',
  'call': 'call_completed',
  'email': 'email_sent',
  'meeting': 'meeting_held',
  'feature': 'feature_used',
  'feedback': 'feedback_received',
  'support': 'support_ticket_created',
  'trial_start': 'trial_started',
  'trial_extend': 'trial_extended',
  'trial_end': 'trial_ended',
  'stage_change': 'stage_changed',
  'note': 'note_added',
};

// Roadmap status mapping
const ROADMAP_STATUS_MAP: Record<string, RoadmapItemStatus> = {
  'planned': 'planned',
  'plan': 'planned',
  'todo': 'planned',
  'progress': 'in_progress',
  'in_progress': 'in_progress',
  'wip': 'in_progress',
  'doing': 'in_progress',
  'done': 'completed',
  'completed': 'completed',
  'complete': 'completed',
  'blocked': 'blocked',
  'stuck': 'blocked',
};

// Roadmap priority mapping
const ROADMAP_PRIORITY_MAP: Record<string, RoadmapItemPriority> = {
  'low': 'low',
  'medium': 'medium',
  'med': 'medium',
  'high': 'high',
};

// Domain category mapping
const DOMAIN_MAP: Record<string, DomainCategory> = {
  'aad': 'AAD',
  'automotive': 'AAD',
  'aerospace': 'AAD',
  'defense': 'AAD',
  'afb': 'AF&B',
  'food': 'AF&B',
  'beverage': 'AF&B',
  'agriculture': 'AF&B',
  'ec': 'E&C',
  'energy': 'E&C',
  'chemicals': 'E&C',
  'hc': 'HC',
  'healthcare': 'HC',
  'health': 'HC',
  'neo': 'NEO',
  'new economy': 'NEO',
  'tmt': 'TMT',
  'tech': 'TMT',
  'media': 'TMT',
  'telecom': 'TMT',
};

// Helper: Extract org name from "at [org]" or "@[org]" patterns
function extractOrg(text: string): { org: string | null; remaining: string } {
  // Try "at OrgName" pattern
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9\s&.-]+?)(?:\s+(?:ran|did|logged|used|for|on|with|-|$)|\s*$)/i);
  if (atMatch) {
    return { org: atMatch[1].trim(), remaining: text.replace(atMatch[0], ' ').trim() };
  }

  // Try "@OrgName" pattern
  const mentionMatch = text.match(/@([A-Za-z0-9_-]+)/);
  if (mentionMatch) {
    return { org: mentionMatch[1], remaining: text.replace(mentionMatch[0], ' ').trim() };
  }

  // Try "[OrgName]" pattern
  const bracketMatch = text.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    return { org: bracketMatch[1], remaining: text.replace(bracketMatch[0], ' ').trim() };
  }

  return { org: null, remaining: text };
}

// Helper: Extract user name from "John" or "John Smith" at start
function extractUser(text: string): { user: string | null; remaining: string } {
  // Match name at beginning (capitalized word or two words)
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:at|@|\[)/);
  if (nameMatch) {
    return { user: nameMatch[1], remaining: text.slice(nameMatch[1].length).trim() };
  }
  return { user: null, remaining: text };
}

// Helper: Extract priority
function extractPriority(text: string): { priority: TicketPriority | null; remaining: string } {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (PRIORITY_MAP[word]) {
      return {
        priority: PRIORITY_MAP[word],
        remaining: text.replace(new RegExp(`\\b${word}\\b`, 'i'), '').trim()
      };
    }
  }
  return { priority: null, remaining: text };
}

// Helper: Parse dollar amount
function extractDealValue(text: string): { value: number | null; remaining: string } {
  const valueMatch = text.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*([kmb])?/i);
  if (valueMatch) {
    let value = parseFloat(valueMatch[1].replace(/,/g, ''));
    const multiplier = valueMatch[2]?.toLowerCase();
    if (multiplier === 'k') value *= 1000;
    if (multiplier === 'm') value *= 1000000;
    if (multiplier === 'b') value *= 1000000000;
    return { value, remaining: text.replace(valueMatch[0], '').trim() };
  }
  return { value: null, remaining: text };
}

// Define slash commands
const SLASH_COMMANDS: SlashCommandDef[] = [
  {
    action: 'LOG_ACTIVITY',
    aliases: ['/log', '/activity', '/a'],
    usage: '/log [activity] [user] at [org]',
    example: '/log query John at Acme',
    parseArgs: (args) => {
      const { user, remaining: afterUser } = extractUser(args);
      const { org, remaining: afterOrg } = extractOrg(afterUser);

      // Find activity type in remaining text
      let activityType: ActivityType = 'query';
      const words = afterOrg.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (ACTIVITY_TYPE_MAP[word]) {
          activityType = ACTIVITY_TYPE_MAP[word];
          break;
        }
      }

      return {
        org_name: org || undefined,
        user_name: user || undefined,
        activity_type: activityType,
        details: afterOrg.replace(/\b(query|login|demo|call|email|meeting|feature|feedback|support)\b/gi, '').trim() || undefined,
      };
    },
  },
  // Quick-log shortcuts for rapid activity logging
  {
    action: 'LOG_ACTIVITY',
    aliases: ['/q'],
    usage: '/q [org] [count]',
    example: '/q Acme 5',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      // Extract query count if provided
      const countMatch = afterOrg.match(/(\d+)/);
      const count = countMatch ? parseInt(countMatch[1]) : 1;

      // Remaining text after removing org and count is org name if not extracted
      const orgName = org || afterOrg.replace(/\d+/g, '').trim();

      return {
        org_name: orgName || undefined,
        activity_type: 'query' as ActivityType,
        details: count > 1 ? `${count} queries executed` : 'Query executed',
      };
    },
  },
  {
    action: 'LOG_ACTIVITY',
    aliases: ['/call'],
    usage: '/call [org] - [details]',
    example: '/call Acme - pricing discussed',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      // Extract details after hyphen or remaining text
      const hyphenIndex = afterOrg.indexOf('-');
      let details: string | undefined;
      let orgName = org;

      if (hyphenIndex > 0) {
        details = afterOrg.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterOrg.slice(0, hyphenIndex).trim();
        }
      } else {
        orgName = orgName || afterOrg.trim();
      }

      return {
        org_name: orgName || undefined,
        activity_type: 'call' as ActivityType,
        details: details || 'Call completed',
      };
    },
  },
  {
    action: 'LOG_ACTIVITY',
    aliases: ['/checkin', '/ci'],
    usage: '/checkin [org] - [details]',
    example: '/checkin Acme - all good',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      const hyphenIndex = afterOrg.indexOf('-');
      let details: string | undefined;
      let orgName = org;

      if (hyphenIndex > 0) {
        details = afterOrg.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterOrg.slice(0, hyphenIndex).trim();
        }
      } else {
        orgName = orgName || afterOrg.trim();
      }

      return {
        org_name: orgName || undefined,
        activity_type: 'check_in' as ActivityType,
        details: details || 'Check-in completed',
      };
    },
  },
  {
    action: 'LOG_ACTIVITY',
    aliases: ['/fu', '/followup'],
    usage: '/fu [org] - [details]',
    example: '/fu Acme - sent proposal',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      const hyphenIndex = afterOrg.indexOf('-');
      let details: string | undefined;
      let orgName = org;

      if (hyphenIndex > 0) {
        details = afterOrg.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterOrg.slice(0, hyphenIndex).trim();
        }
      } else {
        orgName = orgName || afterOrg.trim();
      }

      return {
        org_name: orgName || undefined,
        activity_type: 'follow_up' as ActivityType,
        details: details || 'Follow-up completed',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/win'],
    usage: '/win [org] [$value] - [details]',
    example: '/win Acme $50k - annual contract',
    parseArgs: (args) => {
      const { value: dealValue, remaining: afterValue } = extractDealValue(args);
      const { org, remaining: afterOrg } = extractOrg(afterValue);

      const hyphenIndex = afterOrg.indexOf('-');
      let details: string | undefined;
      let orgName = org;

      if (hyphenIndex > 0) {
        details = afterOrg.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterOrg.slice(0, hyphenIndex).trim();
        }
      } else {
        orgName = orgName || afterOrg.trim();
      }

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'customer' as LifecycleStage,
        deal_value: dealValue || undefined,
        deal_status: 'won' as const,
        details: details || 'Deal won',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/lost', '/churn'],
    usage: '/lost [org] - [reason]',
    example: '/lost Acme - no budget',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      const hyphenIndex = afterOrg.indexOf('-');
      let reason: string | undefined;
      let orgName = org;

      if (hyphenIndex > 0) {
        reason = afterOrg.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterOrg.slice(0, hyphenIndex).trim();
        }
      } else {
        orgName = orgName || afterOrg.trim();
      }

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'lost' as LifecycleStage,
        deal_status: 'lost' as const,
        details: reason || 'Deal lost',
      };
    },
  },
  {
    action: 'CREATE_ORG',
    aliases: ['/org', '/neworg', '/trial'],
    usage: '/org [name] [website] [domain]',
    example: '/org "Acme Corp" acme.com tech',
    parseArgs: (args) => {
      // Try to extract quoted name first
      const quotedMatch = args.match(/["']([^"']+)["']/);
      let orgName: string;
      let remaining: string;

      if (quotedMatch) {
        orgName = quotedMatch[1];
        remaining = args.replace(quotedMatch[0], '').trim();
      } else {
        // Take first word(s) until we hit a URL-like thing or category
        const parts = args.split(/\s+/);
        const nameParts: string[] = [];
        const restParts: string[] = [];
        let foundNonName = false;

        for (const part of parts) {
          if (!foundNonName && !part.includes('.') && !DOMAIN_MAP[part.toLowerCase()]) {
            nameParts.push(part);
          } else {
            foundNonName = true;
            restParts.push(part);
          }
        }

        orgName = nameParts.join(' ');
        remaining = restParts.join(' ');
      }

      // Extract website
      const urlMatch = remaining.match(/([a-zA-Z0-9-]+\.(?:com|io|co|org|net|ai|app)(?:\/[^\s]*)?)/);
      const website = urlMatch ? urlMatch[1] : undefined;

      // Extract domain category
      let domainCategory: DomainCategory | undefined;
      for (const word of remaining.toLowerCase().split(/\s+/)) {
        if (DOMAIN_MAP[word]) {
          domainCategory = DOMAIN_MAP[word];
          break;
        }
      }

      // Extract team size
      const teamMatch = remaining.match(/(\d+)\s*(?:users?|people|team|seats?)/i);
      const teamSize = teamMatch ? parseInt(teamMatch[1]) : undefined;

      // Extract deal value
      const { value: contractValue } = extractDealValue(remaining);

      return {
        org_name: orgName || undefined,
        website,
        domain_category: domainCategory,
        team_size: teamSize,
        contract_value: contractValue || undefined,
      };
    },
  },
  {
    action: 'CREATE_USER',
    aliases: ['/user', '/contact', '/newuser'],
    usage: '/user [email] [name] [org]',
    example: '/user john@acme.com "John Doe" at Acme',
    parseArgs: (args) => {
      // Extract email
      const emailMatch = args.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const email = emailMatch ? emailMatch[1] : undefined;
      const afterEmail = emailMatch ? args.replace(emailMatch[0], '').trim() : args;

      // Extract org
      const { org, remaining: afterOrg } = extractOrg(afterEmail);

      // Extract quoted name or remaining text as name
      const quotedMatch = afterOrg.match(/["']([^"']+)["']/);
      let userName: string | undefined;

      if (quotedMatch) {
        userName = quotedMatch[1];
      } else {
        // Remaining text is probably the name
        userName = afterOrg.replace(/\bat\b.*$/i, '').trim() || undefined;
      }

      // Extract role from common patterns
      const roleMatch = afterOrg.match(/\b(admin|user|manager|engineer|developer|analyst|executive|cto|ceo|vp|director)\b/i);
      const role = roleMatch ? roleMatch[1] : undefined;

      return {
        org_name: org || undefined,
        user_name: userName,
        email,
        role,
      };
    },
  },
  {
    action: 'CREATE_TICKET',
    aliases: ['/ticket', '/bug', '/issue'],
    usage: '/ticket [title] [priority] [category]',
    example: '/ticket "Login broken" high bug @Acme',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);
      const { priority, remaining: afterPriority } = extractPriority(afterOrg);

      // Extract category
      let category: TicketCategory | undefined;
      let afterCategory = afterPriority;
      for (const word of afterPriority.toLowerCase().split(/\s+/)) {
        if (CATEGORY_MAP[word]) {
          category = CATEGORY_MAP[word];
          afterCategory = afterPriority.replace(new RegExp(`\\b${word}\\b`, 'i'), '').trim();
          break;
        }
      }

      // Extract quoted title or remaining text
      const quotedMatch = afterCategory.match(/["']([^"']+)["']/);
      let title: string;
      let description: string | undefined;

      if (quotedMatch) {
        title = quotedMatch[1];
        description = afterCategory.replace(quotedMatch[0], '').trim() || undefined;
      } else {
        title = afterCategory.trim();
      }

      return {
        org_name: org || undefined,
        ticket_title: title || undefined,
        ticket_description: description,
        ticket_priority: priority || 'medium',
        ticket_category: category || 'other',
      };
    },
  },
  {
    action: 'CREATE_FEATURE_REQUEST',
    aliases: ['/feature', '/request', '/fr'],
    usage: '/feature [title] [priority] @[org]',
    example: '/feature "Dark mode" high @Acme',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);
      const { priority, remaining: afterPriority } = extractPriority(afterOrg);

      // Extract quoted title or remaining text
      const quotedMatch = afterPriority.match(/["']([^"']+)["']/);
      let title: string;
      let description: string | undefined;

      if (quotedMatch) {
        title = quotedMatch[1];
        description = afterPriority.replace(quotedMatch[0], '').trim() || undefined;
      } else {
        title = afterPriority.trim();
      }

      return {
        org_name: org || undefined,
        feature_title: title || undefined,
        feature_description: description,
        feature_priority: (priority as FeatureRequestPriority) || 'medium',
      };
    },
  },
  {
    action: 'ADD_NOTE',
    aliases: ['/note', '/n'],
    usage: '/note [text] @[org]',
    example: '/note "Great progress on POC" @Acme',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);
      const { user, remaining: afterUser } = extractUser(afterOrg);

      // Extract quoted note or remaining text
      const quotedMatch = afterUser.match(/["']([^"']+)["']/);
      const noteText = quotedMatch ? quotedMatch[1] : afterUser.trim();

      return {
        org_name: org || undefined,
        user_name: user || undefined,
        note_text: noteText || undefined,
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/stage', '/s'],
    usage: '/stage [org] [new_stage]',
    example: '/stage Acme customer',
    parseArgs: (args) => {
      // Find stage in text
      let stage: LifecycleStage | undefined;
      let afterStage = args;

      for (const [key, value] of Object.entries(STAGE_MAP)) {
        if (args.toLowerCase().includes(key)) {
          stage = value;
          afterStage = args.replace(new RegExp(`\\b${key}\\b`, 'i'), '').trim();
          break;
        }
      }

      // Remaining text is org name
      const { org, remaining } = extractOrg(afterStage);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: stage,
      };
    },
  },
  {
    action: 'UPDATE_DEAL',
    aliases: ['/deal', '/d'],
    usage: '/deal [org] $[value] [status]',
    example: '/deal Acme $50k won',
    parseArgs: (args) => {
      const { value, remaining: afterValue } = extractDealValue(args);
      const { org, remaining: afterOrg } = extractOrg(afterValue);

      // Find deal status
      let dealStatus: 'prospect' | 'negotiating' | 'won' | 'lost' | 'deferred' | undefined;
      const statusMatch = afterOrg.match(/\b(prospect|negotiating|won|lost|deferred|closed)\b/i);
      if (statusMatch) {
        const status = statusMatch[1].toLowerCase();
        dealStatus = status === 'closed' ? 'won' : status as any;
      }

      // Remaining is org name if not extracted
      const orgName = org || afterOrg.replace(/\b(prospect|negotiating|won|lost|deferred|closed)\b/gi, '').trim();

      return {
        org_name: orgName || undefined,
        deal_value: value || undefined,
        deal_status: dealStatus,
      };
    },
  },
  {
    action: 'ASSIGN_ACCOUNT_MANAGER',
    aliases: ['/am', '/assign'],
    usage: '/am [org] [am_name]',
    example: '/am Acme "Sarah Smith"',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      // Extract quoted AM name or remaining
      const quotedMatch = afterOrg.match(/["']([^"']+)["']/);
      const amName = quotedMatch ? quotedMatch[1] : afterOrg.trim();

      // If no org extracted, try to split "OrgName AMName"
      let orgName = org;
      let accountManagerName = amName;

      if (!orgName && amName) {
        const parts = amName.split(/\s+/);
        if (parts.length >= 2) {
          // Assume last 1-2 words are AM name, rest is org
          const isLastPartName = /^[A-Z][a-z]+$/.test(parts[parts.length - 1]);
          if (isLastPartName && parts.length > 2) {
            accountManagerName = parts.slice(-2).join(' ');
            orgName = parts.slice(0, -2).join(' ');
          }
        }
      }

      return {
        org_name: orgName || undefined,
        account_manager_name: accountManagerName || undefined,
      };
    },
  },
  {
    action: 'CREATE_TIMELINE_EVENT',
    aliases: ['/event', '/timeline', '/e'],
    usage: '/event [type] [title] @[org]',
    example: '/event demo "Quarterly Review" @Acme',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);
      const { user, remaining: afterUser } = extractUser(afterOrg);

      // Find event type
      let eventType: TimelineEventType = 'other';
      let afterType = afterUser;

      for (const [key, value] of Object.entries(EVENT_TYPE_MAP)) {
        if (afterUser.toLowerCase().includes(key)) {
          eventType = value;
          afterType = afterUser.replace(new RegExp(`\\b${key}\\b`, 'i'), '').trim();
          break;
        }
      }

      // Extract quoted title or remaining
      const quotedMatch = afterType.match(/["']([^"']+)["']/);
      const title = quotedMatch ? quotedMatch[1] : afterType.trim();

      return {
        org_name: org || undefined,
        user_name: user || undefined,
        event_type: eventType,
        event_title: title || undefined,
      };
    },
  },
  {
    action: 'CREATE_ROADMAP_ITEM',
    aliases: ['/roadmap', '/task', '/milestone', '/rm'],
    usage: '/roadmap [title] [status] [priority] @[org]',
    example: '/roadmap "Q1 Feature Release" planned high @Acme',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      // Extract status
      let status: RoadmapItemStatus = 'planned';
      let afterStatus = afterOrg;
      for (const [key, value] of Object.entries(ROADMAP_STATUS_MAP)) {
        if (afterOrg.toLowerCase().includes(key)) {
          status = value;
          afterStatus = afterOrg.replace(new RegExp(`\\b${key}\\b`, 'i'), '').trim();
          break;
        }
      }

      // Extract priority
      let priority: RoadmapItemPriority = 'medium';
      let afterPriority = afterStatus;
      for (const [key, value] of Object.entries(ROADMAP_PRIORITY_MAP)) {
        if (afterStatus.toLowerCase().includes(key)) {
          priority = value;
          afterPriority = afterStatus.replace(new RegExp(`\\b${key}\\b`, 'i'), '').trim();
          break;
        }
      }

      // Extract quoted title or remaining text
      const quotedMatch = afterPriority.match(/["']([^"']+)["']/);
      let title: string;
      let description: string | undefined;

      if (quotedMatch) {
        title = quotedMatch[1];
        description = afterPriority.replace(quotedMatch[0], '').trim() || undefined;
      } else {
        title = afterPriority.trim();
      }

      return {
        org_name: org || undefined,
        roadmap_title: title || undefined,
        roadmap_description: description,
        roadmap_status: status,
        roadmap_priority: priority,
      };
    },
  },
  // Quick stage/status shortcuts
  {
    action: 'UPDATE_STAGE',
    aliases: ['/expire', '/expired'],
    usage: '/expire [org]',
    example: '/expire Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'trial_expired' as LifecycleStage,
        trial_status: 'closed',
        details: 'Trial expired',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/activate', '/active', '/start'],
    usage: '/activate [org]',
    example: '/activate Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'trial_active' as LifecycleStage,
        trial_status: 'active',
        details: 'Trial activated',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/extend', '/extended'],
    usage: '/extend [org]',
    example: '/extend Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'trial_active' as LifecycleStage,
        trial_status: 'extended',
        details: 'Trial extended',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/complete', '/completed'],
    usage: '/complete [org]',
    example: '/complete Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        trial_status: 'completed',
        details: 'Trial completed',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/pending', '/approve'],
    usage: '/pending [org]',
    example: '/pending Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'trial_pending' as LifecycleStage,
        trial_status: 'approved',
        details: 'Trial approved, pending start',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/prospect', '/new'],
    usage: '/prospect [org]',
    example: '/prospect Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'prospect' as LifecycleStage,
        trial_status: 'requested',
        details: 'New prospect',
      };
    },
  },
  {
    action: 'UPDATE_STAGE',
    aliases: ['/convert', '/customer'],
    usage: '/convert [org] [$value]',
    example: '/convert Acme $50k',
    parseArgs: (args) => {
      const { value: dealValue, remaining: afterValue } = extractDealValue(args);
      const { org, remaining } = extractOrg(afterValue);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
        lifecycle_stage: 'customer' as LifecycleStage,
        trial_status: 'completed',
        deal_value: dealValue || undefined,
        deal_status: 'won' as const,
        details: 'Converted to customer',
      };
    },
  },
  // Delete commands
  {
    action: 'DELETE_ORG',
    aliases: ['/delete-org', '/rm-org', '/del-org'],
    usage: '/delete-org [org]',
    example: '/delete-org Acme',
    parseArgs: (args) => {
      const { org, remaining } = extractOrg(args);
      const orgName = org || remaining.trim();

      return {
        org_name: orgName || undefined,
      };
    },
  },
  {
    action: 'DELETE_USER',
    aliases: ['/delete-user', '/rm-user', '/del-user'],
    usage: '/delete-user [user] at [org]',
    example: '/delete-user John at Acme',
    parseArgs: (args) => {
      const { user, remaining: afterUser } = extractUser(args);
      const { org, remaining } = extractOrg(afterUser);

      // If no user extracted, the arg itself might be the user name
      const userName = user || remaining.trim();

      return {
        org_name: org || undefined,
        user_name: userName || undefined,
      };
    },
  },
  {
    action: 'DELETE_TICKET',
    aliases: ['/delete-ticket', '/rm-ticket', '/del-ticket'],
    usage: '/delete-ticket [ticket_id or title]',
    example: '/delete-ticket "Login bug"',
    parseArgs: (args) => {
      // Extract quoted title or ID
      const quotedMatch = args.match(/["']([^"']+)["']/);
      const titleOrId = quotedMatch ? quotedMatch[1] : args.trim();

      return {
        ticket_title: titleOrId || undefined,
        ticket_id: titleOrId || undefined,
      };
    },
  },
  {
    action: 'DELETE_FEATURE_REQUEST',
    aliases: ['/delete-feature', '/rm-feature', '/del-feature', '/delete-fr'],
    usage: '/delete-feature [title]',
    example: '/delete-feature "Dark mode"',
    parseArgs: (args) => {
      const quotedMatch = args.match(/["']([^"']+)["']/);
      const title = quotedMatch ? quotedMatch[1] : args.trim();

      return {
        feature_title: title || undefined,
      };
    },
  },
  {
    action: 'DELETE_NOTE',
    aliases: ['/delete-note', '/rm-note', '/del-note'],
    usage: '/delete-note [note_id]',
    example: '/delete-note abc123',
    parseArgs: (args) => {
      return {
        note_id: args.trim() || undefined,
      };
    },
  },
  // Quick status update command
  {
    action: 'QUICK_STATUS_UPDATE',
    aliases: ['/status', '/update', '/su'],
    usage: '/status [org] [sentiment] - [message]',
    example: '/status Acme positive - demo went great',
    parseArgs: (args) => {
      const { org, remaining: afterOrg } = extractOrg(args);

      // Extract sentiment keywords
      let sentiment: 'positive' | 'neutral' | 'negative' | undefined;
      let afterSentiment = afterOrg;

      if (/\b(positive|good|great|well)\b/i.test(afterOrg)) {
        sentiment = 'positive';
        afterSentiment = afterOrg.replace(/\b(positive|good|great|well)\b/i, '').trim();
      } else if (/\b(negative|bad|concern|issue|problem)\b/i.test(afterOrg)) {
        sentiment = 'negative';
        afterSentiment = afterOrg.replace(/\b(negative|bad|concern|issue|problem)\b/i, '').trim();
      } else if (/\b(neutral|ok|okay)\b/i.test(afterOrg)) {
        sentiment = 'neutral';
        afterSentiment = afterOrg.replace(/\b(neutral|ok|okay)\b/i, '').trim();
      }

      // Extract status text after hyphen or remaining
      const hyphenIndex = afterSentiment.indexOf('-');
      let statusText: string;
      let orgName = org;

      if (hyphenIndex > 0) {
        statusText = afterSentiment.slice(hyphenIndex + 1).trim();
        if (!orgName) {
          orgName = afterSentiment.slice(0, hyphenIndex).trim();
        }
      } else {
        statusText = afterSentiment.trim();
        orgName = orgName || undefined;
      }

      return {
        org_name: orgName || undefined,
        status_text: statusText || 'Status update',
        sentiment,
      };
    },
  },
];

/**
 * Check if input is a slash command
 */
export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('/');
}

/**
 * Parse a slash command into a ParsedCommand structure
 * Returns null if not a valid slash command
 */
export function parseSlashCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  if (!isSlashCommand(trimmed)) {
    return null;
  }

  // Extract command and args
  const spaceIndex = trimmed.indexOf(' ');
  const command = spaceIndex > 0 ? trimmed.slice(0, spaceIndex).toLowerCase() : trimmed.toLowerCase();
  const args = spaceIndex > 0 ? trimmed.slice(spaceIndex + 1).trim() : '';

  // Find matching command definition
  const commandDef = SLASH_COMMANDS.find(def =>
    def.aliases.some(alias => alias.toLowerCase() === command)
  );

  if (!commandDef) {
    return null;
  }

  // Parse arguments
  const parsed = commandDef.parseArgs(args);

  return {
    action: commandDef.action,
    confidence: 0.95, // Slash commands have high confidence
    org_name: parsed.org_name || null,
    user_name: parsed.user_name || null,
    fields: {
      ...parsed,
      // Remove org_name and user_name from fields (they're top-level)
      org_name: undefined,
      user_name: undefined,
    } as ParsedCommand['fields'],
    reasoning: `Parsed from slash command: ${command}`,
  };
}

/**
 * Get all available slash commands for help display
 */
export function getSlashCommands(): Array<{
  command: string;
  aliases: string[];
  action: CommandAction;
  usage: string;
  example: string;
}> {
  return SLASH_COMMANDS.map(def => ({
    command: def.aliases[0],
    aliases: def.aliases.slice(1),
    action: def.action,
    usage: def.usage,
    example: def.example,
  }));
}

/**
 * Get suggestions for partial slash command input
 */
export function getSlashCommandSuggestions(partial: string): Array<{
  command: string;
  description: string;
}> {
  if (!partial.startsWith('/')) return [];

  const query = partial.toLowerCase();

  return SLASH_COMMANDS
    .filter(def => def.aliases.some(alias => alias.startsWith(query)))
    .map(def => ({
      command: def.aliases[0],
      description: def.usage,
    }))
    .slice(0, 5);
}
