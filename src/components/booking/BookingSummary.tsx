import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface BookingSummaryProps {
    totalPrice: number;
    totalDiscount: number;
    onSubmit: () => void;
    disabled: boolean;
    brandColor?: string;
}

export const BookingSummary = ({
    totalPrice,
    totalDiscount,
    onSubmit,
    disabled,
    brandColor,
}: BookingSummaryProps) => {
    const buttonStyle = brandColor ? { 
        backgroundColor: brandColor,
        borderColor: brandColor,
    } : undefined;
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 sm:p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 safe-area-inset-bottom">
            <div className="container max-w-4xl mx-auto">
                {/* Mobile: Stacked layout */}
                <div className="flex flex-col gap-2 sm:hidden">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">お支払い予定金額（税込）</p>
                        {totalDiscount > 0 && (
                            <span className="text-xs text-success font-medium">
                                ¥{totalDiscount.toLocaleString()} お得
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <p 
                            className="text-2xl font-bold"
                            style={{ color: brandColor || 'hsl(var(--primary))' }}
                        >
                            ¥{totalPrice.toLocaleString()}
                        </p>
                        <Button
                            size="lg"
                            onClick={onSubmit}
                            disabled={disabled}
                            className="flex-1 max-w-[200px] h-12 shadow-lg touch-manipulation"
                            style={buttonStyle}
                        >
                            予約する
                            <Icon name="arrow_forward" size={16} className="ml-1" />
                        </Button>
                    </div>
                </div>

                {/* Desktop: Side by side layout */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">お支払い予定金額（税込）</p>
                        <div className="flex items-baseline gap-2">
                            <p 
                                className="text-2xl font-bold"
                                style={{ color: brandColor || 'hsl(var(--primary))' }}
                            >
                                ¥{totalPrice.toLocaleString()}
                            </p>
                            {totalDiscount > 0 && (
                                <span className="text-sm text-success font-medium">
                                    (¥{totalDiscount.toLocaleString()} お得)
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        size="lg"
                        onClick={onSubmit}
                        disabled={disabled}
                        className="shadow-lg hover:shadow-xl transition-all"
                        style={buttonStyle}
                    >
                        予約内容を確認する
                        <Icon name="arrow_forward" size={16} className="ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
