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
      <div className="max-w-md sm:max-w-lg mx-auto px-4 sm:px-6">
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
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold transition-all duration-300",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/30",
                      !isCompleted && !isCurrent && "bg-white border-2 border-gray-300 text-gray-400"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={3.5} />
                    ) : (
                      step.id
                    )}
                  </div>
                </button>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div
                    className={cn(
                        "h-1 sm:h-1.5 rounded-full transition-colors duration-300",
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
        <div className="flex items-start justify-between mt-3 sm:mt-4">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="w-12 sm:w-14 flex-shrink-0 flex justify-center">
                  <span
                    className={cn(
                      "text-sm sm:text-base font-semibold whitespace-nowrap transition-colors",
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
                  <div className="flex-1 mx-2 sm:mx-3" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
