import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStep {
    id: 'basicInfo' | 'services' | 'businessHours';
    title: string;
    description: string;
    isCompleted: boolean;
}

export interface OnboardingStatus {
    isCompleted: boolean;
    completedAt: Date | null;
    steps: OnboardingStep[];
    incompletedCount: number;
}

export function useOnboardingStatus() {
    const { organization, organizationId, initialized, refreshOrganization } = useAuth();
    const [status, setStatus] = useState<OnboardingStatus>({
        isCompleted: false,
        completedAt: null,
        steps: [],
        incompletedCount: 3,
    });
    const [isLoading, setIsLoading] = useState(true);

    const checkStatus = useCallback(async () => {
        if (!initialized) return;

        if (!organizationId) {
            setIsLoading(false);
            return;
        }

        try {
            // Check if organization has phone
            const hasPhone = !!(organization as any)?.phone;

            // Check if organization has business hours
            const businessHours = (organization as any)?.business_hours;
            const hasBusinessHours = businessHours && Object.keys(businessHours).length > 0;

            // Check if organization has at least one service
            const { count: serviceCount } = await supabase
                .from('services')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            const hasServices = (serviceCount ?? 0) > 0;

            const steps: OnboardingStep[] = [
                {
                    id: 'basicInfo',
                    title: '店舗情報',
                    description: '電話番号を登録してください',
                    isCompleted: hasPhone,
                },
                {
                    id: 'services',
                    title: 'サービス登録',
                    description: '提供するサービスを1つ以上登録してください',
                    isCompleted: hasServices,
                },
                {
                    id: 'businessHours',
                    title: '営業時間',
                    description: '営業時間を設定してください',
                    isCompleted: hasBusinessHours,
                },
            ];

            const incompletedCount = steps.filter(s => !s.isCompleted).length;
            const isCompleted = incompletedCount === 0;
            const completedAt = (organization as any)?.onboarding_completed_at
                ? new Date((organization as any).onboarding_completed_at)
                : null;

            setStatus({
                isCompleted,
                completedAt,
                steps,
                incompletedCount,
            });
        } catch (error) {
            console.error('Error checking onboarding status:', error);
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, organization]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    return {
        ...status,
        isLoading,
        refresh: async () => {
            await refreshOrganization();
            await checkStatus();
        },
    };
}
