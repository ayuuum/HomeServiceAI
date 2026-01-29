import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/booking";
import { Icon } from "@/components/ui/icon";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendar";
import { extractCityDistrict } from "@/lib/addressUtils";
import BookingEditModal from "./BookingEditModal";

interface BookingDetailModalProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  onSuccess?: () => void;
}

export const BookingDetailModal = ({
  booking,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onSuccess,
}: BookingDetailModalProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  if (!booking) return null;

  const sendNotification = async (bookingId: string, type: 'confirmed' | 'cancelled') => {
    try {
      await supabase.functions.invoke('send-booking-notification', {
        body: { bookingId, notificationType: type }
      });
    } catch (error) {
      console.error('Notification error:', error);
      // Don't block the main flow if notification fails
    }
  };

  const handleApproveWithPreference = async (preferenceNum: 1 | 2 | 3) => {
    const dateField = `preference${preferenceNum}Date` as keyof Booking;
    const timeField = `preference${preferenceNum}Time` as keyof Booking;
    const prefDate = booking[dateField] as string | undefined;
    const prefTime = booking[timeField] as string | undefined;

    if (!prefDate || !prefTime) return;

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          approved_preference: preferenceNum,
          selected_date: prefDate,
          selected_time: prefTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
      await sendNotification(booking.id, 'confirmed');
      toast.success(`第${preferenceNum}希望で予約を承認しました`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("予約の承認に失敗しました");
    } finally {
      setIsApproving(false);
    }
  };

  const handleApprove = async () => {
    // 希望日時がある場合は第1希望で承認
    if (booking.preference1Date && booking.preference1Time) {
      await handleApproveWithPreference(1);
    } else {
      // 従来の予約（希望日時なし）
      setIsApproving(true);
      onApprove(booking.id);
      await sendNotification(booking.id, 'confirmed');
      setIsApproving(false);
      onOpenChange(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    onReject(booking.id);
    await sendNotification(booking.id, 'cancelled');
    setIsRejecting(false);
    onOpenChange(false);
  };

  const handleEditSuccess = () => {
    onSuccess?.();
  };

  const handleSendReminder = async () => {
    try {
      setIsSendingReminder(true);
      const { data, error } = await supabase.functions.invoke('send-booking-reminder', {
        body: { bookingId: booking.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("リマインダーを送信しました");
    } catch (error) {
      console.error('Reminder error:', error);
      toast.error(error instanceof Error ? error.message : "リマインダーの送信に失敗しました");
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-2xl">予約詳細</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">ステータス:</span>
            {booking.status === "pending" && (
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                <Icon name="schedule" size={12} className="mr-1" />
                承認待ち
              </Badge>
            )}
            {booking.status === "confirmed" && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Icon name="check_circle" size={12} className="mr-1" />
                確定済み
              </Badge>
            )}
            {booking.status === "cancelled" && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                <Icon name="cancel" size={12} className="mr-1" />
                キャンセル
              </Badge>
            )}
          </div>

          <Separator />

          {/* Service Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="description" size={20} className="text-primary" />
              サービス内容
            </h3>
            <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-2">
              <p className="font-semibold text-base md:text-lg">{booking.serviceName}</p>
              {booking.optionsSummary.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">選択オプション:</p>
                  <ul className="space-y-1">
                    {booking.optionsSummary.map((option, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="person" size={20} className="text-primary" />
              お客様情報
            </h3>
            <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20 md:w-24 flex-shrink-0">お名前:</span>
                <span className="font-medium">{booking.customerName}</span>
              </div>
              {booking.customerEmail && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20 md:w-24 flex-shrink-0">メール:</span>
                  <span className="font-medium">{booking.customerEmail}</span>
                </div>
              )}
              {booking.customerPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20 md:w-24 flex-shrink-0">電話番号:</span>
                  <span className="font-medium">{booking.customerPhone}</span>
                </div>
              )}
              {(booking.customerPostalCode || booking.customerAddress) && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground w-20 md:w-24 flex-shrink-0">住所:</span>
                  <div className="font-medium">
                    <p>
                      {booking.customerPostalCode && `〒${booking.customerPostalCode} `}
                      {booking.customerAddress || ""}
                    </p>
                    {booking.customerAddressBuilding && (
                      <p className="text-muted-foreground">{booking.customerAddressBuilding}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pre-information (Diagnosis) */}
          {(booking.diagnosisHasParking !== undefined || booking.diagnosisNotes) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Icon name="assignment" size={20} className="text-primary" />
                  事前情報
                </h3>
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-2">
                  {booking.diagnosisHasParking !== undefined && (
                    <div className="flex items-center gap-2">
                      <Icon 
                        name={booking.diagnosisHasParking ? "local_parking" : "block"} 
                        size={18} 
                        className={booking.diagnosisHasParking ? "text-success" : "text-muted-foreground"} 
                      />
                      <span className="text-sm">
                        駐車場: {booking.diagnosisHasParking ? "あり" : "なし"}
                      </span>
                    </div>
                  )}
                  {booking.diagnosisNotes && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">備考:</p>
                      <p className="text-sm whitespace-pre-wrap bg-background/50 p-2 rounded border">
                        {booking.diagnosisNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Date & Time - 希望日時がある場合は複数表示 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="calendar_today" size={20} className="text-primary" />
              {booking.preference1Date ? "希望日時" : "予約日時"}
            </h3>
            <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-3">
              {/* 希望日時がある場合（新システム） */}
              {booking.preference1Date && booking.status === "pending" ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((num) => {
                    const prefDate = booking[`preference${num}Date` as keyof Booking] as string | undefined;
                    const prefTime = booking[`preference${num}Time` as keyof Booking] as string | undefined;
                    if (!prefDate || !prefTime) return null;
                    
                    return (
                      <div key={num} className="flex items-center justify-between p-2 rounded-lg border bg-background">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">第{num}希望</span>
                          <span className="font-medium">
                            {format(new Date(prefDate), "M/d(E)", { locale: ja })} {prefTime}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleApproveWithPreference(num as 1 | 2 | 3)}
                          disabled={isApproving}
                          className="h-8"
                        >
                          {isApproving ? (
                            <Icon name="sync" size={14} className="animate-spin" />
                          ) : (
                            <>この日時で承認</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* 確定済み or 従来の予約 */}
                  <div className="flex items-center gap-3">
                    <Icon name="calendar_today" size={20} className="text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(booking.selectedDate), "yyyy年M月d日(E)", { locale: ja })}
                    </span>
                    {booking.approvedPreference && (
                      <Badge variant="outline" className="text-xs">第{booking.approvedPreference}希望</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="schedule" size={20} className="text-muted-foreground" />
                    <span className="font-medium">{booking.selectedTime}〜</span>
                  </div>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-primary/20 hover:bg-primary/5 text-primary"
                onClick={() => {
                  // 住所から区・市を抽出してタイトルに追加
                  const locationSuffix = booking.customerAddress
                    ? extractCityDistrict(booking.customerAddress)
                    : null;

                  const calendarTitle = locationSuffix
                    ? `予約: ${booking.serviceName}（${locationSuffix}）- ${booking.customerName}様`
                    : `予約: ${booking.serviceName} - ${booking.customerName}様`;

                  // 場所情報を組み立て
                  const locationParts = [
                    booking.customerPostalCode ? `〒${booking.customerPostalCode}` : '',
                    booking.customerAddress,
                    booking.customerAddressBuilding,
                  ].filter(Boolean);
                  const calendarLocation = locationParts.length > 0 
                    ? locationParts.join(' ') 
                    : undefined;

                  // 詳細情報を組み立て
                  const detailsLines = [
                    `【メニュー】`,
                    booking.serviceName,
                    ``,
                    `【料金】`,
                    `¥${booking.totalPrice.toLocaleString()}`,
                    ``,
                    `【お客様情報】`,
                    `${booking.customerName} 様`,
                  ];
                  if (booking.customerPhone) {
                    detailsLines.push(booking.customerPhone);
                  }
                  if (booking.customerEmail) {
                    detailsLines.push(booking.customerEmail);
                  }

                  // 事前情報を追加
                  if (booking.diagnosisHasParking !== undefined || booking.diagnosisNotes) {
                    detailsLines.push(``);
                    detailsLines.push(`【事前情報】`);
                    if (booking.diagnosisHasParking !== undefined) {
                      detailsLines.push(`駐車場: ${booking.diagnosisHasParking ? 'あり' : 'なし'}`);
                    }
                    if (booking.diagnosisNotes) {
                      detailsLines.push(`備考: ${booking.diagnosisNotes}`);
                    }
                  }

                  const url = generateGoogleCalendarUrl({
                    title: calendarTitle,
                    details: detailsLines.join('\n'),
                    location: calendarLocation,
                    date: new Date(booking.selectedDate),
                    time: booking.selectedTime,
                    durationMinutes: 60,
                  });
                  window.open(url, '_blank');
                }}
              >
                <Icon name="calendar_today" size={16} className="mr-2" />
                Googleカレンダーに追加
              </Button>
            </div>
          </div>

          <Separator />

          {/* Price */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">料金</h3>
            <div className="bg-primary/5 p-3 md:p-4 rounded-lg">
              <div className="flex items-baseline justify-between">
                <span className="text-base md:text-lg font-semibold">合計金額</span>
                <div className="text-right">
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    ¥{booking.totalPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">税込</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking Info */}
          <div className="text-xs text-muted-foreground">
            <p>予約受付日時: {format(new Date(booking.createdAt), "yyyy年M月d日 HH:mm", { locale: ja })}</p>
          </div>

          {/* Actions */}
          {booking.status === "pending" && (
            <div className="space-y-3 pt-4">
              <div className="flex gap-2 md:gap-3">
                <Button
                  className="flex-1 btn-primary h-10 md:h-12 text-sm md:text-base"
                  onClick={handleApprove}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Icon name="sync" size={18} className="mr-1 md:mr-2 animate-spin" />
                  ) : (
                    <Icon name="check_circle" size={18} className="mr-1 md:mr-2" />
                  )}
                  <span className="hidden md:inline">予約を</span>承認<span className="hidden md:inline">する</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 md:h-12 text-sm md:text-base border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleReject}
                  disabled={isRejecting}
                >
                  {isRejecting ? (
                    <Icon name="sync" size={18} className="mr-1 md:mr-2 animate-spin" />
                  ) : (
                    <Icon name="cancel" size={18} className="mr-1 md:mr-2" />
                  )}
                  <span className="hidden md:inline">予約を</span>却下<span className="hidden md:inline">する</span>
                </Button>
              </div>
              <div className="flex gap-2 md:gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Icon name="edit" size={14} className="mr-1 md:mr-2" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm"
                  onClick={handleSendReminder}
                  disabled={isSendingReminder || !booking.customerId}
                >
                  {isSendingReminder ? (
                    <Icon name="sync" size={14} className="mr-1 md:mr-2 animate-spin" />
                  ) : (
                    <Icon name="notifications" size={14} className="mr-1 md:mr-2" />
                  )}
                  <span className="hidden md:inline">リマインド送信</span><span className="md:hidden">通知</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                        .eq('id', booking.id);

                      if (error) throw error;

                      await sendNotification(booking.id, 'cancelled');
                      toast.success("予約をキャンセルしました");
                      onSuccess?.();
                      onOpenChange(false);
                    } catch (error) {
                      toast.error("予約のキャンセルに失敗しました");
                    }
                  }}
                >
                  <Icon name="cancel" size={16} className="mr-2" />
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {booking.status === "confirmed" && (
            <div className="space-y-3 pt-4">
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
                <Icon name="check_circle" size={32} className="text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-success">この予約は承認済みです</p>
              </div>
              <div className="flex gap-2 md:gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Icon name="edit" size={14} className="mr-1 md:mr-2" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm"
                  onClick={handleSendReminder}
                  disabled={isSendingReminder || !booking.customerId}
                >
                  {isSendingReminder ? (
                    <Icon name="sync" size={14} className="mr-1 md:mr-2 animate-spin" />
                  ) : (
                    <Icon name="notifications" size={14} className="mr-1 md:mr-2" />
                  )}
                  <span className="hidden md:inline">リマインド送信</span><span className="md:hidden">通知</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 md:h-11 text-xs md:text-sm border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                        .eq('id', booking.id);

                      if (error) throw error;

                      await sendNotification(booking.id, 'cancelled');
                      toast.success("予約をキャンセルしました");
                      onSuccess?.();
                      onOpenChange(false);
                    } catch (error) {
                      toast.error("予約のキャンセルに失敗しました");
                    }
                  }}
                >
                  <Icon name="cancel" size={16} className="mr-2" />
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {booking.status === "cancelled" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
              <Icon name="cancel" size={32} className="text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium text-destructive">この予約はキャンセルされました</p>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <BookingEditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          booking={{
            id: booking.id,
            selected_date: booking.selectedDate,
            selected_time: booking.selectedTime,
            customer_name: booking.customerName,
            customer_phone: booking.customerPhone || '',
            customer_email: booking.customerEmail || '',
            customer_postal_code: booking.customerPostalCode || '',
            customer_address: booking.customerAddress || '',
            customer_address_building: booking.customerAddressBuilding || '',
          }}
          onSuccess={handleEditSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
