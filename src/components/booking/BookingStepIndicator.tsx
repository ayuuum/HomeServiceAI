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
    <div className="w-full py-4 sm:py-5">
      <div className="flex items-center justify-between max-w-md sm:max-w-lg mx-auto px-4 sm:px-6">
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
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold transition-all duration-300",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-6 sm:-bottom-7 text-sm sm:text-base whitespace-nowrap transition-colors font-medium",
                    isCurrent && "text-primary",
                    isCompleted && "text-green-600",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.shortLabel}
                </span>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1.5 sm:mx-2">
                  <div
                    className={cn(
                      "h-1 sm:h-1.5 rounded-full transition-colors duration-300",
                      currentStep > step.id ? "bg-green-500" : "bg-muted"
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
