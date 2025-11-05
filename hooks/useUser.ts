'use client';

import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'AM' | 'Team' | 'Admin';
}

export function useUser() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return { user: null, loading };
  }

  const userProfile: UserProfile = {
    id: user.id,
    email: user.email || '',
    fullName: user.user_metadata?.full_name || user.email || 'Unknown User',
    role: user.user_metadata?.role || 'AM',
  };

  return {
    user: userProfile,
    loading: false,
  };
}
