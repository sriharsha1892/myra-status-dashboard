/**
 * Announcements System
 * Allows admins to post custom status messages and announcements
 */

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'maintenance';
  active: boolean;
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
}

// In-memory storage
let announcements: Announcement[] = [];

/**
 * Create a new announcement
 */
export function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  const announcement: Announcement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    ...data,
  };

  announcements.unshift(announcement);
  return announcement;
}

/**
 * Get all active announcements
 */
export function getActiveAnnouncements(): Announcement[] {
  const now = new Date();
  return announcements.filter(ann => {
    if (!ann.active) return false;
    if (ann.expiresAt && new Date(ann.expiresAt) < now) {
      return false;
    }
    return true;
  });
}

/**
 * Get all announcements (admin)
 */
export function getAllAnnouncements(): Announcement[] {
  return [...announcements];
}

/**
 * Update announcement
 */
export function updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement | null {
  const index = announcements.findIndex(ann => ann.id === id);
  if (index === -1) return null;

  announcements[index] = {
    ...announcements[index],
    ...updates,
  };

  return announcements[index];
}

/**
 * Delete announcement
 */
export function deleteAnnouncement(id: string): boolean {
  const index = announcements.findIndex(ann => ann.id === id);
  if (index === -1) return false;

  announcements.splice(index, 1);
  return true;
}
