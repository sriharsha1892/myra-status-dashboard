/**
 * Session Context Manager
 * Tracks recent orgs/users per session for contextual command parsing
 */

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Maximum items to track
const MAX_RECENT_ORGS = 5;
const MAX_RECENT_USERS = 5;

/**
 * Recent organization entry
 */
export interface RecentOrg {
  orgId: string;
  orgName: string;
  timestamp: number;
  commandCount: number;
}

/**
 * Recent user entry
 */
export interface RecentUser {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  timestamp: number;
}

/**
 * Last action reference
 */
export interface LastAction {
  action: string;
  orgId: string | null;
  orgName: string | null;
  userId: string | null;
  timestamp: number;
}

/**
 * Session context structure
 */
export interface SessionContext {
  sessionId: string;
  userId: string;
  recentOrgs: RecentOrg[];
  recentUsers: RecentUser[];
  lastAction: LastAction | null;
  commandCount: number;
  createdAt: number;
  lastActivityAt: number;
}

/**
 * In-memory session store
 * Key: sessionId (or `user:${userId}` for user-based sessions)
 */
const sessionStore = new Map<string, SessionContext>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if session is expired
 */
function isSessionExpired(session: SessionContext): boolean {
  return Date.now() - session.lastActivityAt > SESSION_TIMEOUT_MS;
}

/**
 * Get or create session for a user
 */
export function getSession(userId: string): SessionContext {
  const key = `user:${userId}`;
  let session = sessionStore.get(key);

  if (!session || isSessionExpired(session)) {
    session = {
      sessionId: generateSessionId(),
      userId,
      recentOrgs: [],
      recentUsers: [],
      lastAction: null,
      commandCount: 0,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    sessionStore.set(key, session);
  }

  return session;
}

/**
 * Update session activity timestamp
 */
export function touchSession(userId: string): void {
  const session = getSession(userId);
  session.lastActivityAt = Date.now();
}

/**
 * Record an org reference in the session
 */
export function recordOrgUsage(
  userId: string,
  orgId: string,
  orgName: string
): void {
  const session = getSession(userId);
  session.lastActivityAt = Date.now();

  // Check if org already exists
  const existingIndex = session.recentOrgs.findIndex(o => o.orgId === orgId);

  if (existingIndex >= 0) {
    // Update existing entry
    const existing = session.recentOrgs[existingIndex];
    existing.timestamp = Date.now();
    existing.commandCount++;
    // Move to front
    session.recentOrgs.splice(existingIndex, 1);
    session.recentOrgs.unshift(existing);
  } else {
    // Add new entry at front
    session.recentOrgs.unshift({
      orgId,
      orgName,
      timestamp: Date.now(),
      commandCount: 1,
    });
    // Trim to max size
    if (session.recentOrgs.length > MAX_RECENT_ORGS) {
      session.recentOrgs.pop();
    }
  }
}

/**
 * Record a user reference in the session
 */
export function recordUserUsage(
  userId: string,
  targetUserId: string,
  targetUserName: string,
  orgId: string,
  orgName: string
): void {
  const session = getSession(userId);
  session.lastActivityAt = Date.now();

  // Check if user already exists
  const existingIndex = session.recentUsers.findIndex(u => u.userId === targetUserId);

  if (existingIndex >= 0) {
    // Update existing entry
    const existing = session.recentUsers[existingIndex];
    existing.timestamp = Date.now();
    // Move to front
    session.recentUsers.splice(existingIndex, 1);
    session.recentUsers.unshift(existing);
  } else {
    // Add new entry at front
    session.recentUsers.unshift({
      userId: targetUserId,
      userName: targetUserName,
      orgId,
      orgName,
      timestamp: Date.now(),
    });
    // Trim to max size
    if (session.recentUsers.length > MAX_RECENT_USERS) {
      session.recentUsers.pop();
    }
  }
}

/**
 * Record last action
 */
export function recordAction(
  userId: string,
  action: string,
  orgId: string | null,
  orgName: string | null,
  targetUserId: string | null
): void {
  const session = getSession(userId);
  session.lastActivityAt = Date.now();
  session.commandCount++;
  session.lastAction = {
    action,
    orgId,
    orgName,
    userId: targetUserId,
    timestamp: Date.now(),
  };
}

/**
 * Get most recent org from session
 */
export function getMostRecentOrg(userId: string): RecentOrg | null {
  const session = getSession(userId);
  return session.recentOrgs[0] || null;
}

/**
 * Get most recent user from session
 */
export function getMostRecentUser(userId: string): RecentUser | null {
  const session = getSession(userId);
  return session.recentUsers[0] || null;
}

/**
 * Find user by name in session history
 */
export function findUserInSession(userId: string, userName: string): RecentUser | null {
  const session = getSession(userId);
  const lowerName = userName.toLowerCase();

  return session.recentUsers.find(u =>
    u.userName.toLowerCase().includes(lowerName) ||
    lowerName.includes(u.userName.toLowerCase().split(' ')[0])
  ) || null;
}

/**
 * Clear session for a user
 */
export function clearSession(userId: string): void {
  const key = `user:${userId}`;
  sessionStore.delete(key);
}

/**
 * Get session summary for display
 */
export function getSessionSummary(userId: string): {
  hasContext: boolean;
  mostRecentOrg: string | null;
  recentOrgCount: number;
  recentUserCount: number;
  commandCount: number;
  sessionAge: number;
} {
  const session = getSession(userId);
  const mostRecent = session.recentOrgs[0];

  return {
    hasContext: session.recentOrgs.length > 0,
    mostRecentOrg: mostRecent?.orgName || null,
    recentOrgCount: session.recentOrgs.length,
    recentUserCount: session.recentUsers.length,
    commandCount: session.commandCount,
    sessionAge: Date.now() - session.createdAt,
  };
}

/**
 * Contextual reference patterns
 */
const SAME_ORG_PATTERNS = [
  /\bsame\s+org\b/i,
  /\bthem\s+again\b/i,
  /\bsame\s+company\b/i,
  /\bsame\s+customer\b/i,
  /\bagain\s+for\s+them\b/i,
  /\bfor\s+them\b/i,
];

const SAME_USER_PATTERNS = [
  /\bsame\s+user\b/i,
  /\bsame\s+person\b/i,
  /\bhim\s+again\b/i,
  /\bher\s+again\b/i,
  /\bthem\s+again\b/i,
];

const USER_AGAIN_PATTERN = /\b(\w+)\s+again\b/i;

/**
 * Resolve contextual references in command text
 * Returns the resolved org/user info and cleaned command text
 */
export function resolveContextualReferences(
  userId: string,
  commandText: string
): {
  resolvedOrg: { orgId: string; orgName: string } | null;
  resolvedUser: { userId: string; userName: string } | null;
  cleanedText: string;
  confidenceAdjustment: number;
  resolutionNote: string | null;
} {
  const session = getSession(userId);
  let resolvedOrg: { orgId: string; orgName: string } | null = null;
  let resolvedUser: { userId: string; userName: string } | null = null;
  let cleanedText = commandText;
  let confidenceAdjustment = 0;
  let resolutionNote: string | null = null;

  // Check for "same org" patterns
  for (const pattern of SAME_ORG_PATTERNS) {
    if (pattern.test(commandText)) {
      const mostRecent = session.recentOrgs[0];
      if (mostRecent) {
        resolvedOrg = { orgId: mostRecent.orgId, orgName: mostRecent.orgName };
        cleanedText = commandText.replace(pattern, mostRecent.orgName);
        confidenceAdjustment = 0.05; // Boost for explicit reference
        resolutionNote = `Resolved "same org" to ${mostRecent.orgName}`;
      }
      break;
    }
  }

  // Check for "same user" patterns
  for (const pattern of SAME_USER_PATTERNS) {
    if (pattern.test(commandText)) {
      const mostRecent = session.recentUsers[0];
      if (mostRecent) {
        resolvedUser = { userId: mostRecent.userId, userName: mostRecent.userName };
        cleanedText = cleanedText.replace(pattern, mostRecent.userName);
        confidenceAdjustment += 0.03;
        resolutionNote = (resolutionNote ? resolutionNote + '; ' : '') +
          `Resolved "same user" to ${mostRecent.userName}`;
      }
      break;
    }
  }

  // Check for "[Name] again" pattern
  const userAgainMatch = commandText.match(USER_AGAIN_PATTERN);
  if (userAgainMatch && !resolvedUser) {
    const userName = userAgainMatch[1];
    const foundUser = findUserInSession(userId, userName);
    if (foundUser) {
      resolvedUser = { userId: foundUser.userId, userName: foundUser.userName };
      cleanedText = cleanedText.replace(USER_AGAIN_PATTERN, foundUser.userName);
      confidenceAdjustment += 0.03;
      resolutionNote = (resolutionNote ? resolutionNote + '; ' : '') +
        `Resolved "${userName} again" to ${foundUser.userName}`;

      // Also resolve org if not already resolved
      if (!resolvedOrg) {
        resolvedOrg = { orgId: foundUser.orgId, orgName: foundUser.orgName };
      }
    }
  }

  return {
    resolvedOrg,
    resolvedUser,
    cleanedText,
    confidenceAdjustment,
    resolutionNote,
  };
}

/**
 * Build context string for LLM prompt injection
 */
export function buildContextPrompt(userId: string): string {
  const session = getSession(userId);

  if (session.recentOrgs.length === 0) {
    return '';
  }

  const lines: string[] = ['SESSION CONTEXT:'];

  const mostRecentOrg = session.recentOrgs[0];
  if (mostRecentOrg) {
    lines.push(`- Most recent org: "${mostRecentOrg.orgName}" (used ${mostRecentOrg.commandCount} time(s))`);
  }

  if (session.recentOrgs.length > 1) {
    const otherOrgs = session.recentOrgs.slice(1, 3).map(o => o.orgName).join(', ');
    lines.push(`- Other recent orgs: ${otherOrgs}`);
  }

  const mostRecentUser = session.recentUsers[0];
  if (mostRecentUser) {
    lines.push(`- Most recent user: "${mostRecentUser.userName}" at ${mostRecentUser.orgName}`);
  }

  lines.push('');
  lines.push('If user says "same org", "them again", or omits org name after recent commands, assume the most recent org.');

  return lines.join('\n');
}

/**
 * Cleanup expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): number {
  let cleaned = 0;
  const now = Date.now();

  for (const [key, session] of sessionStore.entries()) {
    if (now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
      sessionStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// Cleanup expired sessions every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}
