import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const { user, initialized } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        console.log('AuthCallback: State update -', { hasUser: !!user, initialized });

        // 認証が完了し、組織データの初期化も終わったら管理画面へ
        if (user && initialized) {
            console.log('AuthCallback: User authenticated and initialized, redirecting to admin');
            navigate('/admin', { replace: true });
            return;
        }

        // タイムアウト監視（万が一初期化が終わらない場合のため）
        if (!timeoutRef.current) {
            timeoutRef.current = setTimeout(() => {
                console.warn('AuthCallback: Timeout waiting for full initialization');
                if (user) {
                    // ユーザーはいるが組織取得が終わっていない場合でも、
                    // 管理画面（ProtectedRoute）側で待機させるためリダイレクト
                    navigate('/admin', { replace: true });
                } else {
                    console.error('AuthCallback: No session detected after 10s, returning to login');
                    navigate('/login', { replace: true });
                }
            }, 10000);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, initialized, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <div>
                    <h2 className="text-xl font-semibold">認証処理中...</h2>
                    <p className="text-muted-foreground mt-2">まもなく管理画面へ移動します</p>
                </div>
            </div>
        </div>
    );
}
