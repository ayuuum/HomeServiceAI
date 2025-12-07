import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface BookingSummaryProps {
    totalPrice: number;
    totalDiscount: number;
    onSubmit: () => void;
    disabled: boolean;
}

export const BookingSummary = ({
    totalPrice,
    totalDiscount,
    onSubmit,
    disabled,
}: BookingSummaryProps) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <div className="container max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">お支払い予定金額（税込）</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-primary">
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
                >
                    予約内容を確認する
                    <Icon name="arrow_forward" size={16} className="ml-2" />
                </Button>
            </div>
        </div>
    );
};
