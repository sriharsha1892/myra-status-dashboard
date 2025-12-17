'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  role: 'AM' | 'Team' | 'Admin' | null;
  parent_company: string;
  is_super_admin: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'AM' | 'Team' | 'Admin' | null>(null);
  const [userParentCompany, setUserParentCompany] = useState<string>('Mordor Intelligence');
  const [userIsSuperAdmin, setUserIsSuperAdmin] = useState<boolean>(false);
  const router = useRouter();

  // Lazy initialize Supabase client only on client-side
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Fetch user role and details from users table
  const fetchUserDetails = async (userId: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('role, parent_company, is_super_admin')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        // Map database roles to expected types (Admin, Account Manager)
        let mappedRole: 'AM' | 'Team' | 'Admin' | null = null;
        if (data.role === 'Admin') {
          mappedRole = 'Admin';
        } else if (data.role === 'Account Manager') {
          mappedRole = 'AM';
        }

        setUserRole(mappedRole);
        setUserParentCompany(data.parent_company || 'Mordor Intelligence');
        setUserIsSuperAdmin(data.is_super_admin || false);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserDetails(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setUserRole(null);
        setUserParentCompany('Mordor Intelligence');
        setUserIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    try {
      const supabase = getSupabase();

      // Supabase automatically persists sessions in localStorage
      // The session will stay valid for the configured expiration time (default: 1 hour token, 30 days refresh)
      // rememberMe parameter is for UI/UX purposes - we show different messaging
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push('/');
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    role: userRole,
    parent_company: userParentCompany,
    is_super_admin: userIsSuperAdmin,
  };
}
