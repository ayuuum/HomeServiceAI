import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <Icon name="check" size={28} className="text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-bold">
            ご予約リクエストを受け付けました
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/70">
            ありがとうございます
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* メインメッセージ */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Icon name="calendar_month" size={20} className="text-primary" />
              <span className="font-semibold text-base">日程調整中</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ご希望日程をもとに調整し、メールでご連絡いたします
            </p>
          </div>
        </div>

        {/* 注意事項（アコーディオン） */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="notes" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2">
              注意事項を確認する
            </AccordionTrigger>
            <AccordionContent>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>メーカーと型番によってはご対応できない場合もございます</li>
                <li>日程が重なった場合、調整をお願いすることがございます</li>
                <li>3日以上ご返信がない場合はキャンセルとなる場合がございます</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full h-11 text-base font-semibold mt-2"
        >
          閉じる
        </Button>
      </DialogContent>
    </Dialog>
  );
};
