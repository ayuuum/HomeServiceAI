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
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";
import { extractCityDistrict } from "@/lib/addressUtils";
import { Calendar, Sparkles, MapPin, User, Phone } from "lucide-react";

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

// 簡易的な予約番号を生成（日時ベース）
const generateBookingNumber = (date: Date): string => {
  const dateStr = format(date, "yyMMdd");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${dateStr}-${random}`;
};

export const BookingConfirmationModal = ({
  open,
  onOpenChange,
  bookingData,
}: BookingConfirmationModalProps) => {
  if (!bookingData) return null;

  // 予約番号を生成
  const bookingNumber = generateBookingNumber(bookingData.date);

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
    ``,
    `【予約番号】`,
    bookingNumber,
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
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <Icon name="check_circle" size={56} className="text-success" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold">
            ご予約ありがとうございます！
          </DialogTitle>
          <DialogDescription className="text-base sm:text-lg">
            予約リクエストを受け付けました
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-6">
          {/* 予約番号カード */}
          <Card className="bg-primary/10 border-primary/30 border-2 p-6">
            <div className="text-center space-y-2">
              <span className="text-base sm:text-lg text-muted-foreground">予約番号</span>
              <p className="text-3xl sm:text-4xl font-bold text-primary tracking-wider">
                #{bookingNumber}
              </p>
            </div>
          </Card>

          {/* 予約詳細カード */}
          <Card className="border-2 p-6 sm:p-8">
            <div className="space-y-5">
              {/* 予約日時 */}
              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-base text-muted-foreground block">予約日時</span>
                  <p className="text-lg sm:text-xl font-bold">
                    {format(bookingData.date, "yyyy年M月d日(E)", { locale: ja })} {bookingData.time}〜
                  </p>
                </div>
              </div>

              {/* サービス */}
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-base text-muted-foreground block">サービス</span>
                  <p className="text-lg sm:text-xl font-bold">{bookingData.serviceName}</p>
                </div>
              </div>

              {/* 住所（ある場合） */}
              {location && (
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-base text-muted-foreground block">お伺い先</span>
                    <p className="text-base sm:text-lg font-medium">{location}</p>
                  </div>
                </div>
              )}

              {/* お客様情報（ある場合） */}
              {(bookingData.customerName || bookingData.customerPhone) && (
                <div className="flex items-start gap-4">
                  <User className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-base text-muted-foreground block">お客様</span>
                    <div className="space-y-1">
                      {bookingData.customerName && (
                        <p className="text-lg sm:text-xl font-bold">{bookingData.customerName} 様</p>
                      )}
                      {bookingData.customerPhone && (
                        <p className="text-base text-muted-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {bookingData.customerPhone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 合計金額カード */}
          <Card className="bg-primary/10 border-primary/30 border-2 p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg sm:text-xl font-semibold">合計金額（税込）</span>
              <span className="text-2xl sm:text-3xl font-bold text-primary">
                ¥{bookingData.totalPrice.toLocaleString()}
              </span>
            </div>
          </Card>

          {/* 案内メッセージ */}
          <Card className="bg-accent/50 border-0 p-4">
            <p className="text-base text-center text-muted-foreground">
              事業者からの確認連絡をお待ちください
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.open(googleCalendarUrl, '_blank')}
            variant="outline"
            className="w-full h-14 text-base sm:text-lg font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <Icon name="calendar_today" size={22} className="mr-2" />
            Googleカレンダーに追加
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            size="lg"
            className="w-full h-14 text-base sm:text-lg font-semibold"
          >
            画面を閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
