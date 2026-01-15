import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";
import { extractCityDistrict } from "@/lib/addressUtils";

interface BookingConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: {
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
    customerName?: string;
    customerPhone?: string;
    customerPostalCode?: string;
    customerAddress?: string;
    customerAddressBuilding?: string;
  } | null;
}

export const BookingConfirmationModal = ({
  open,
  onOpenChange,
  bookingData,
}: BookingConfirmationModalProps) => {
  if (!bookingData) return null;

  // 住所から区・市を抽出してタイトルに追加
  const locationSuffix = bookingData.customerAddress
    ? extractCityDistrict(bookingData.customerAddress)
    : null;

  const calendarTitle = locationSuffix
    ? `予約: ${bookingData.serviceName}（${locationSuffix}）`
    : `予約: ${bookingData.serviceName}`;

  // 場所情報を組み立て
  const locationParts = [
    bookingData.customerPostalCode ? `〒${bookingData.customerPostalCode}` : '',
    bookingData.customerAddress,
    bookingData.customerAddressBuilding,
  ].filter(Boolean);
  const location = locationParts.join(' ');

  // 詳細情報を組み立て
  const detailsLines = [
    `【メニュー】`,
    bookingData.serviceName,
    ``,
    `【料金】`,
    `¥${bookingData.totalPrice.toLocaleString()}`,
  ];

  if (bookingData.customerName || bookingData.customerPhone) {
    detailsLines.push(``);
    detailsLines.push(`【お客様情報】`);
    if (bookingData.customerName) {
      detailsLines.push(`${bookingData.customerName} 様`);
    }
    if (bookingData.customerPhone) {
      detailsLines.push(bookingData.customerPhone);
    }
  }

  const googleCalendarUrl = generateGoogleCalendarUrl({
    title: calendarTitle,
    details: detailsLines.join('\n'),
    location: location || undefined,
    date: bookingData.date,
    time: bookingData.time,
    durationMinutes: 60,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <Icon name="check_circle" size={48} className="text-success" />
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

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.open(googleCalendarUrl, '_blank')}
            variant="outline"
            className="w-full h-12 text-base border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <Icon name="calendar_today" size={20} className="mr-2" />
            Googleカレンダーに追加
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            size="lg"
            className="w-full h-12 text-base"
          >
            画面を閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
