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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organizationId: string | null;
  organization: Organization | null;
  loading: boolean;
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

  const fetchOrganization = async (userId: string) => {
    // Fetch the user's profile to get organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id);

      // Fetch organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, brand_color, welcome_message')
        .eq('id', profile.organization_id)
        .single();

      if (org) {
        setOrganization(org);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch organization info after auth state change
        if (session?.user) {
          setTimeout(() => {
            fetchOrganization(session.user.id);
          }, 0);
        } else {
          setOrganizationId(null);
          setOrganization(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchOrganization(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
          redirectTo: `${window.location.origin}/admin`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setOrganizationId(null);
    setOrganization(null);
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
