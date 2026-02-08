import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/icon';

export default function AuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('AuthCallback event:', event);
            if (event === 'SIGNED_IN' && session) {
                // Redirect to admin dashboard once signed in
                navigate('/admin', { replace: true });
            }
            if (event === 'INITIAL_SESSION' && session) {
                navigate('/admin', { replace: true });
            }
        });

        // Also check current session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/admin', { replace: true });
            }
        });

        // Safety timeout: if nothing happens in 10 seconds, go to login
        const timeout = setTimeout(() => {
            navigate('/login', { replace: true });
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <Icon name="sync" size={48} className="animate-spin mx-auto text-primary" />
                <h2 className="text-xl font-semibold">認証処理中...</h2>
                <p className="text-muted-foreground italic">安全にアカウントを紐づけています。少々お待ちください。</p>
            </div>
        </div>
    );
}
