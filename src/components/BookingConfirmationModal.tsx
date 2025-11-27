import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface BookingConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: {
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
  } | null;
}

export const BookingConfirmationModal = ({
  open,
  onOpenChange,
  bookingData,
}: BookingConfirmationModalProps) => {
  if (!bookingData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <DialogTitle className="text-2xl">
            ご予約ありがとうございます！
          </DialogTitle>
          <DialogDescription className="text-base">
            予約リクエストを受け付けました
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">予約日時</span>
              <span className="font-medium">
                {format(bookingData.date, "yyyy年M月d日(E)", { locale: ja })} {bookingData.time}〜
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">サービス</span>
              <span className="font-medium">{bookingData.serviceName}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">合計金額</span>
              <span className="text-xl font-bold text-primary">
                ¥{bookingData.totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-accent/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              事業者からの確認連絡をお待ちください
            </p>
          </div>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          size="lg"
          className="w-full h-12 text-base"
        >
          画面を閉じる
        </Button>
      </DialogContent>
    </Dialog>
  );
};
