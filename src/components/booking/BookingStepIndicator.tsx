import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  shortLabel: string;
}

interface BookingStepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const steps: Step[] = [
  { id: 1, label: "サービス選択", shortLabel: "サービス" },
  { id: 2, label: "日時選択", shortLabel: "日時" },
  { id: 3, label: "お客様情報", shortLabel: "情報" },
  { id: 4, label: "確認", shortLabel: "確認" },
];

export const BookingStepIndicator = ({
  currentStep,
  onStepClick,
}: BookingStepIndicatorProps) => {
  return (
    <div className="w-full py-3 sm:pt-4 sm:pb-8">
      <div className="flex items-center justify-between max-w-xs sm:max-w-md mx-auto px-4 sm:px-6">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = step.id <= 3; // All main steps are always clickable

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "relative flex flex-col items-center group",
                  isClickable && "cursor-pointer hover:opacity-80"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-5 sm:-bottom-6 text-[10px] sm:text-xs whitespace-nowrap transition-colors",
                    isCurrent && "text-primary font-medium",
                    isCompleted && "text-primary",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.shortLabel}
                </span>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1 sm:mx-2">
                  <div
                    className={cn(
                      "h-0.5 transition-colors duration-300",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
