import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/ui/icon';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if we're in the middle of an OAuth callback (URL contains access_token in hash)
  const isOAuthCallback = location.hash.includes('access_token');

  // Show loading if either auth is loading OR we're processing OAuth callback
  if (loading || (isOAuthCallback && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Icon name="sync" size={32} className="animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

