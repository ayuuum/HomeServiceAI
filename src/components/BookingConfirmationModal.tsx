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
  brandColor?: string;
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
  brandColor,
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
      <DialogContent className="max-w-md p-4">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <Icon name="check_circle" size={32} className="text-success" />
          </div>
          <DialogTitle className="text-lg font-bold">
            ご予約ありがとうございます！
          </DialogTitle>
          <DialogDescription className="text-sm">
            予約リクエストを受け付けました
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {/* 予約番号カード */}
          <Card 
            className="border p-3"
            style={brandColor ? {
              backgroundColor: `${brandColor}10`,
              borderColor: `${brandColor}30`
            } : undefined}
          >
            <div className="text-center">
              <span className="text-xs text-muted-foreground">予約番号</span>
              <p 
                className="text-xl font-bold tracking-wider"
                style={{ color: brandColor || 'hsl(var(--primary))' }}
              >
                #{bookingNumber}
              </p>
            </div>
          </Card>

          {/* 予約詳細カード */}
          <Card className="border p-3">
            <div className="space-y-2">
              {/* 予約日時 */}
              <div className="flex items-center gap-2">
                <Calendar 
                  className="w-4 h-4 flex-shrink-0" 
                  style={{ color: brandColor || 'hsl(var(--primary))' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">予約日時</span>
                  <p className="text-sm font-bold truncate">
                    {format(bookingData.date, "M/d(E)", { locale: ja })} {bookingData.time}〜
                  </p>
                </div>
              </div>

              {/* サービス */}
              <div className="flex items-center gap-2">
                <Sparkles 
                  className="w-4 h-4 flex-shrink-0" 
                  style={{ color: brandColor || 'hsl(var(--primary))' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">サービス</span>
                  <p className="text-sm font-bold truncate">{bookingData.serviceName}</p>
                </div>
              </div>

              {/* 住所（ある場合） */}
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin 
                    className="w-4 h-4 flex-shrink-0" 
                    style={{ color: brandColor || 'hsl(var(--primary))' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">お伺い先</span>
                    <p className="text-xs font-medium truncate">{location}</p>
                  </div>
                </div>
              )}

              {/* お客様情報（ある場合） */}
              {(bookingData.customerName || bookingData.customerPhone) && (
                <div className="flex items-center gap-2">
                  <User 
                    className="w-4 h-4 flex-shrink-0" 
                    style={{ color: brandColor || 'hsl(var(--primary))' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">お客様</span>
                    <div className="flex items-center gap-2">
                      {bookingData.customerName && (
                        <span className="text-sm font-bold">{bookingData.customerName} 様</span>
                      )}
                      {bookingData.customerPhone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {bookingData.customerPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 合計金額カード */}
          <Card 
            className="border p-3"
            style={brandColor ? {
              backgroundColor: `${brandColor}10`,
              borderColor: `${brandColor}30`
            } : undefined}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">合計（税込）</span>
              <span 
                className="text-lg font-bold"
                style={{ color: brandColor || 'hsl(var(--primary))' }}
              >
                ¥{bookingData.totalPrice.toLocaleString()}
              </span>
            </div>
          </Card>

          {/* 案内メッセージ */}
          <p className="text-xs text-center text-muted-foreground py-1">
            事業者からの確認連絡をお待ちください
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => window.open(googleCalendarUrl, '_blank')}
            variant="outline"
            className="w-full h-10 text-sm font-semibold"
            style={brandColor ? {
              borderColor: `${brandColor}30`,
              color: brandColor
            } : undefined}
          >
            <Icon name="calendar_today" size={18} className="mr-2" />
            Googleカレンダーに追加
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 text-sm font-semibold"
            style={brandColor ? {
              backgroundColor: brandColor,
              borderColor: brandColor
            } : undefined}
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
