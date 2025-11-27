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
import { Calendar, Clock, User, MapPin, FileText, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

interface BookingDetailModalProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
}

export const BookingDetailModal = ({
  booking,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: BookingDetailModalProps) => {
  if (!booking) return null;

  const handleApprove = () => {
    onApprove(booking.id);
    onOpenChange(false);
  };

  const handleReject = () => {
    onReject(booking.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">予約詳細</DialogTitle>
          <DialogDescription>
            予約ID: {booking.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">ステータス:</span>
            {booking.status === "pending" && (
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                <Clock className="h-3 w-3 mr-1" />
                承認待ち
              </Badge>
            )}
            {booking.status === "confirmed" && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                確定済み
              </Badge>
            )}
            {booking.status === "cancelled" && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                <XCircle className="h-3 w-3 mr-1" />
                キャンセル
              </Badge>
            )}
          </div>

          <Separator />

          {/* Service Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              サービス内容
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-lg">{booking.serviceName}</p>
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
              <User className="h-5 w-5 text-primary" />
              お客様情報
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24">お名前:</span>
                <span className="font-medium">{booking.customerName}</span>
              </div>
              {booking.customerEmail && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-24">メール:</span>
                  <span className="font-medium">{booking.customerEmail}</span>
                </div>
              )}
              {booking.customerPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-24">電話番号:</span>
                  <span className="font-medium">{booking.customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              予約日時
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(booking.selectedDate), "yyyy年M月d日(E)", { locale: ja })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{booking.selectedTime}〜</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Price */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">料金</h3>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">合計金額</span>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
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
              <div className="flex gap-3">
                <Button
                  className="flex-1 btn-primary h-12"
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  予約を承認する
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleReject}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  予約を却下する
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => toast.info("編集機能は近日実装予定です")}
                >
                  編集
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={async () => {
              try {
                const { error } = await supabase
                  .from('bookings')
                  .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                  .eq('id', booking.id);
                
                if (error) throw error;
                
                toast({ title: "予約をキャンセルしました" });
                onSuccess();
                onOpenChange(false);
              } catch (error) {
                toast({ variant: "destructive", title: "キャンセル失敗", description: "予約のキャンセルに失敗しました" });
              }
            }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {booking.status === "confirmed" && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm font-medium text-success">この予約は承認済みです</p>
            </div>
          )}

          {booking.status === "cancelled" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium text-destructive">この予約はキャンセルされました</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
