import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, Coins, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface BookingDetails {
    customerName: string;
    selectedDate: Date;
    selectedTime: string;
    serviceTitles: string[];
    totalPrice: number;
}

interface LiffCompleteScreenProps {
    organizationName: string;
    organizationLogo?: string;
    booking: BookingDetails;
    onClose: () => void;
}

export const LiffCompleteScreen = ({
    organizationName,
    organizationLogo,
    booking,
    onClose,
}: LiffCompleteScreenProps) => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b">
                {organizationLogo && (
                    <img
                        src={organizationLogo}
                        alt={organizationName}
                        className="h-10 w-10 rounded-full object-cover"
                    />
                )}
                <span className="font-medium">{organizationName}</span>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                {/* Success icon */}
                <div className="mb-6">
                    <CheckCircle2 className="h-20 w-20 text-green-500" strokeWidth={1.5} />
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">
                    予約完了！
                </h1>

                <p className="text-muted-foreground text-center mb-8">
                    LINEでメッセージをお送りしました
                </p>

                {/* Booking summary card */}
                <Card className="w-full max-w-sm mb-8">
                    <CardContent className="pt-6 space-y-4">
                        <div className="text-center mb-4">
                            <p className="font-medium">{booking.customerName} 様</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span>
                                {format(booking.selectedDate, "M月d日(E)", { locale: ja })}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span>{booking.selectedTime}〜</span>
                        </div>

                        <div className="flex items-start gap-3">
                            <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <span>{booking.serviceTitles.join(", ")}</span>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t">
                            <Coins className="h-5 w-5 text-muted-foreground" />
                            <span className="font-bold">
                                ¥{booking.totalPrice.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA Button */}
                <Button
                    onClick={onClose}
                    size="lg"
                    className="w-full max-w-sm"
                >
                    LINEに戻る
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4 max-w-xs">
                    この画面を閉じると、LINEトーク画面で確認メッセージが表示されます
                </p>
            </div>
        </div>
    );
};
