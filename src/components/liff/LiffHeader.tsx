import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";

interface LiffHeaderProps {
    displayName?: string;
    pictureUrl?: string;
    currentStep: number;
    totalSteps: number;
    organizationName: string;
    organizationLogo?: string;
}

const stepLabels = ["サービス", "日時", "情報", "確認"];

export const LiffHeader = ({
    displayName,
    pictureUrl,
    currentStep,
    totalSteps,
    organizationName,
    organizationLogo,
}: LiffHeaderProps) => {
    const progressPercent = ((currentStep) / totalSteps) * 100;

    return (
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
            {/* User info bar */}
            <div className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-10 w-10">
                    {pictureUrl ? (
                        <AvatarImage src={pictureUrl} alt={displayName || "User"} />
                    ) : (
                        <AvatarFallback>
                            <User className="h-5 w-5" />
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {displayName ? `${displayName} 様` : "ゲスト 様"}
                    </p>
                    <p className="text-xs text-muted-foreground">ご予約手続き</p>
                </div>
                {organizationLogo && (
                    <img
                        src={organizationLogo}
                        alt={organizationName}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                )}
            </div>

            {/* Step progress */}
            <div className="px-4 pb-3">
                <Progress value={progressPercent} className="h-1.5" />
                <div className="flex justify-between mt-2">
                    {stepLabels.slice(0, totalSteps).map((label, index) => (
                        <span
                            key={label}
                            className={`text-xs ${index < currentStep
                                    ? "text-primary font-medium"
                                    : index === currentStep
                                        ? "text-foreground font-medium"
                                        : "text-muted-foreground"
                                }`}
                        >
                            {index + 1}. {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
