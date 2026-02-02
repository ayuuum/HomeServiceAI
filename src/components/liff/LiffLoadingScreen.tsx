import { Loader2 } from "lucide-react";

interface LiffLoadingScreenProps {
    organizationName?: string;
    organizationLogo?: string;
    message?: string;
}

export const LiffLoadingScreen = ({
    organizationName,
    organizationLogo,
    message = "読み込み中...",
}: LiffLoadingScreenProps) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
            <div className="flex flex-col items-center space-y-6">
                {organizationLogo ? (
                    <img
                        src={organizationLogo}
                        alt={organizationName || ""}
                        className="h-20 w-20 rounded-full object-cover animate-pulse"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}

                {organizationName && (
                    <h1 className="text-xl font-semibold text-foreground">
                        {organizationName}
                    </h1>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                    {organizationLogo && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span className="text-sm">{message}</span>
                </div>
            </div>
        </div>
    );
};
