import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { OnboardingWizard } from '@/components/onboarding';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
    const { user, loading: authLoading } = useAuth();
    const { isCompleted, isLoading: statusLoading } = useOnboardingStatus();
    const navigate = useNavigate();

    useEffect(() => {
        // If not logged in, redirect to login
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        // If onboarding is already completed, redirect to admin
        if (!statusLoading && isCompleted) {
            navigate('/admin');
        }
    }, [isCompleted, statusLoading, navigate]);

    if (authLoading || statusLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <OnboardingWizard
            onComplete={() => navigate('/admin')}
            onSkip={() => navigate('/admin')}
        />
    );
}
