import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  brand_color?: string;
  welcome_message?: string;
  header_layout?: string;
  admin_email?: string;
  booking_headline?: string;
  payment_enabled?: boolean;
  stripe_account_id?: string | null;
  stripe_account_status?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchOrganization = async (userId: string, retryCount = 0) => {
    console.log(`Fetching organization for userId: ${userId} (Attempt: ${retryCount + 1})`);
    // Fetch the user's profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);

      // Retry logic for race conditions (DB trigger not finished)
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 500; // 0.5s, 1s, 2s
        console.log(`Retrying fetchOrganization in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchOrganization(userId, retryCount + 1);
      }
      setInitialized(true); // Stop waiting even if error persists
      return;
    }

    console.log('Fetched profile:', profile);

    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id);

      // Fetch organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, brand_color, welcome_message, header_layout, admin_email, booking_headline, payment_enabled, stripe_account_id, stripe_account_status')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization details:', orgError);
      } else if (org) {
        console.log('Fetched organization details:', org);
        setOrganization(org);
      } else {
        console.warn('No organization found for id:', profile.organization_id);
      }
      setInitialized(true);
    } else {
      console.warn('Profile found but no organization_id associated for user:', userId);

      // If profile exists but no organization_id yet, retry as well (trigger might be mid-execution)
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 500;
        console.log(`Retrying fetchOrganization in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchOrganization(userId, retryCount + 1);
      }
      setInitialized(true);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);

          // Fetch organization info after auth state change
          if (session?.user) {
            await fetchOrganization(session.user.id);
          } else {
            setOrganizationId(null);
            setOrganization(null);
            setInitialized(true);
          }
        } finally {
          setLoading(false);
        }
      }
    );

    // 既存のセッションを確認
    const checkInitialSession = async () => {
      try {
        console.log('AuthContext: Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth getSession failed:', error);
        }

        if (!initialSessionHandled) {
          initialSessionHandled = true;
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchOrganization(session.user.id);
          } else {
            setInitialized(true);
          }
        }

        // セッションの有無に関わらず、ハッシュが含まれていればクリアする
        // これにより、リフレッシュ時に古いトークンが再処理されるのを防ぐ
        if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
          console.log('AuthContext: Clearing hash from URL');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('Auth initial check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // Fallback: ensure loading ends if neither path completes (e.g. Supabase unreachable)
    const timeoutId = setTimeout(() => setLoading(false), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setOrganizationId(null);
      setOrganization(null);
      setInitialized(false);
    }
  };

  const refreshOrganization = async () => {
    if (user) {
      await fetchOrganization(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      organizationId,
      organization,
      loading,
      initialized,
      signIn,
      signInWithGoogle,
      signOut,
      refreshOrganization
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
