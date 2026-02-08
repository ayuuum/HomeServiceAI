import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import {
    Phone,
    ListChecks,
    Clock,
    CheckCircle2,
    ArrowRight,
    Rocket
} from 'lucide-react';

const STEP_ICONS = {
    basicInfo: Phone,
    services: ListChecks,
    businessHours: Clock,
} as const;

const STEP_LINKS = {
    basicInfo: '/admin/profile',
    services: '/admin/profile',
    businessHours: '/admin/profile',
} as const;

export function OnboardingChecklist() {
    const { steps, isCompleted, isLoading, incompletedCount } = useOnboardingStatus();

    if (isLoading) {
        return null;
    }

    if (isCompleted) {
        return null;
    }

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-6">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Rocket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">予約受付の準備をしましょう</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                あと{incompletedCount}ステップで予約ページを公開できます
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary">
                        {completedCount}/{steps.length} 完了
                    </Badge>
                </div>
                <Progress value={progress} className="h-2 mt-3" />
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    {steps.map((step) => {
                        const Icon = STEP_ICONS[step.id];
                        const link = STEP_LINKS[step.id];

                        return (
                            <Link
                                key={step.id}
                                to={link}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${step.isCompleted
                                        ? 'bg-muted/30 border-transparent'
                                        : 'bg-background hover:bg-muted/50 border-border'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-full ${step.isCompleted
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {step.isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Icon className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div>
                                        <p
                                            className={`font-medium text-sm ${step.isCompleted ? 'text-muted-foreground line-through' : ''
                                                }`}
                                        >
                                            {step.title}
                                        </p>
                                        {!step.isCompleted && (
                                            <p className="text-xs text-muted-foreground">{step.description}</p>
                                        )}
                                    </div>
                                </div>
                                {!step.isCompleted && (
                                    <Button variant="ghost" size="sm" className="shrink-0">
                                        設定する
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
