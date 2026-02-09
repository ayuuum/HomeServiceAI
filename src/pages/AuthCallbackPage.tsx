import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        let sub: { unsubscribe: () => void } | null = null;

        const handleAuthCallback = async () => {
            console.log('AuthCallback: Checking initial session...');
            try {
                // 1. まず現在のセッションを直接確認する
                const { data: { session }, error } = await supabase.auth.getSession();

                // セッション取得（または失敗）後、URLハッシュをクリアして無限ループや警告を防ぐ
                if (window.location.hash) {
                    console.log('AuthCallback: Clearing hash from URL');
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }

                if (session) {
                    console.log('AuthCallback: Session found immediately, redirecting to admin');
                    navigate('/admin', { replace: true });
                    return;
                }

                if (error) {
                    console.error('AuthCallback: Error getting session:', error);
                    // エラーがあっても、onAuthStateChange でログインが飛んでくる可能性に賭ける
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
            } catch (err) {
                console.error('AuthCallback unexpected error:', err);
            }
        };

        handleAuthCallback();

        const timeout = setTimeout(() => {
            console.warn('AuthCallback: Timeout waiting for session, final check before redirect...');
            // 最後にもう一度確認
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    navigate('/admin', { replace: true });
                } else {
                    console.error('AuthCallback: No session after 10s timeout, redirecting to login');
                    navigate('/login', { replace: true });
                }
            });
        }, 10000);

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
