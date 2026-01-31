import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { AlertTriangle } from "lucide-react";

interface BookingConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: {
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
    preferences?: { date: Date; time: string }[];
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
      <DialogContent className="max-w-md p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <Icon name="check_circle" size={32} className="text-success" />
          </div>
          <DialogTitle className="text-lg font-bold">
            この度はご注文頂きありがとうございます
          </DialogTitle>
          <DialogDescription className="text-sm">
            予約リクエストを受け付けました
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* 予約後の流れ説明 */}
          <Card className="border p-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                まだ訪問日時が確定していない状態となっており、いただいたご希望日程をもとに訪問日時を確定させていただきますので、もう少しお待ちください。
              </p>
              <p className="text-xs">
                （第1〜第3希望日の中で調整してまいります）
              </p>
              <p className="text-xs">
                繁忙期期間中でございますと、ご提案までに少しお時間をいただくこともございます。
              </p>
            </div>
          </Card>

          {/* 注意事項 */}
          <Card className="border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-warning">注意事項</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>メーカーと型番によってはご対応できない場合もございますので、ご了承ください。</li>
                  <li>お客様に頂いたご希望日程が、同時に注文が入り日程調整をお願いする場合もございます。</li>
                  <li>当店からのメッセージに対し、3日以上ご返信頂けない場合はキャンセルさせていただくこともございます。</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 text-sm font-semibold"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
