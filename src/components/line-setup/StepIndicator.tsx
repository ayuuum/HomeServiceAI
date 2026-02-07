import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ['公式アカウント', 'API有効化', '認証情報', 'Webhook'];

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isCompleted && 'bg-[#06C755] text-white',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span className={cn(
                'text-[10px] whitespace-nowrap',
                isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {stepLabels[i]}
              </span>
            </div>
            {stepNum < totalSteps && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 mt-[-16px]',
                isCompleted ? 'bg-[#06C755]' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
