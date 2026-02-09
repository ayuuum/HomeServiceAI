import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        let sub: { unsubscribe: () => void } | null = null;

        const handleAuthCallback = async () => {
            console.log('AuthCallback: Checking initial session...');
            // 1. まず現在のセッションを直接確認する（URLのハッシュがパースされているか確認）
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session) {
                console.log(' AuthCallback: Session found immediately, redirecting to admin');
                navigate('/admin', { replace: true });
                return;
            }

            if (error) {
                console.error('AuthCallback: Error getting session:', error);
            }

            // 2. まだセッションがない場合は、状態の変化を監視する
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('AuthCallback event:', event, session ? 'Session exists' : 'No session');
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                    console.log('AuthCallback: Auth state change detected session, redirecting to admin');
                    navigate('/admin', { replace: true });
                }
            });
            sub = subscription;
        };

        handleAuthCallback();

        const timeout = setTimeout(() => {
            console.warn('AuthCallback: Timeout waiting for session, redirecting to login');
            navigate('/login', { replace: true });
        }, 10000); // 10秒に延長

        return () => {
            if (sub) {
                sub.unsubscribe();
            }
            clearTimeout(timeout);
        };
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900">認証処理中...</h2>
                <p className="text-gray-500 mt-2">まもなく管理画面へ移動します</p>
            </div>
        </div>
    );
}
