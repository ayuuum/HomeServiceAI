import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserRoles();
    } else {
      setRoles([]);
      setLoading(false);
    }
  }, [user]);

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);

      if (error) throw error;

      setRoles(data?.map((r) => r.role as AppRole) || []);
    } catch (error) {
      console.error('ロール読み込みエラー:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');
  const isUser = hasRole('user');

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isModerator,
    isUser,
  };
}
