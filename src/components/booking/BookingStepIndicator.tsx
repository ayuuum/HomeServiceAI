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
    <div className="w-full py-2 sm:py-3">
      <div className="max-w-sm sm:max-w-md mx-auto px-3 sm:px-4">
        {/* Step circles and connecting lines row */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id <= 3;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex-shrink-0",
                    isClickable && "cursor-pointer hover:opacity-80"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                      !isCompleted && !isCurrent && "bg-white border-2 border-gray-300 text-gray-400"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
                    ) : (
                      step.id
                    )}
                  </div>
                </button>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-1.5 sm:mx-2">
                    <div
                      className={cn(
                        "h-0.5 sm:h-1 rounded-full transition-colors duration-300",
                        currentStep > step.id ? "bg-primary" : "bg-gray-200"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels row - separate from circles/lines */}
        <div className="flex items-start justify-between mt-1.5 sm:mt-2">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="w-7 sm:w-9 flex-shrink-0 flex justify-center">
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-primary",
                      !isCompleted && !isCurrent && "text-gray-400"
                    )}
                  >
                    {step.shortLabel}
                  </span>
                </div>

                {/* Spacer for connector alignment */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-1.5 sm:mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
