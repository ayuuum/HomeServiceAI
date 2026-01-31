import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

type BookingStatus = 'loading' | 'found' | 'not_found' | 'cancelled' | 'already_cancelled';

interface BookingInfo {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  selected_date: string;
  selected_time: string;
  total_price: number;
  status: string;
  created_at: string;
  organization_id: string;
}

export default function CancelBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [status, setStatus] = useState<BookingStatus>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!token) {
        setStatus('not_found');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_booking_by_cancel_token', {
          p_token: token
        });

        if (error) {
          console.error("Error fetching booking:", error);
          setStatus('not_found');
          return;
        }

        if (!data || data.length === 0) {
          setStatus('not_found');
          return;
        }

        const bookingData = data[0] as BookingInfo;
        setBooking(bookingData);

        // Fetch organization name using slug lookup (we'll need to get org by ID differently)
        // Since get_organization_public uses slug, we'll skip org name for now
        // The booking info is sufficient

        if (bookingData.status === 'cancelled') {
          setStatus('already_cancelled');
        } else {
          setStatus('found');
        }
      } catch (error) {
        console.error("Error:", error);
        setStatus('not_found');
      }
    };

    fetchBooking();
  }, [token]);

  const handleCancel = async () => {
    if (!token || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('cancel_booking_by_token', {
        p_token: token
      });

      if (error) {
        console.error("Cancel error:", error);
        toast.error("キャンセルに失敗しました");
        setIsSubmitting(false);
        return;
      }

      if (data) {
        setStatus('cancelled');
        toast.success("予約をキャンセルしました");

        // Send notifications (fire and forget)
        if (booking) {
          // Customer notification (Hybrid: LINE or Email)
          supabase.functions.invoke('send-hybrid-notification', {
            body: { bookingId: booking.id, notificationType: 'cancelled' }
          }).catch(console.error);

          // Admin notification (Email)
          supabase.functions.invoke('send-hybrid-notification', {
            body: {
              bookingId: booking.id,
              notificationType: 'admin_notification',
              adminNotificationType: 'cancelled'
            }
          }).catch(console.error);

          // In-app notification for admin
          supabase
            .from('notifications')
            .insert({
              organization_id: booking.organization_id,
              type: 'booking_cancelled',
              title: `${booking.customer_name}様が予約をキャンセル`,
              message: `${format(new Date(booking.selected_date), "M/d", { locale: ja })} ${booking.selected_time}`,
              resource_type: 'booking',
              resource_id: booking.id
            })
            .then(({ error }) => {
              if (error) console.error('Notification insert error:', error);
            });
        }
      } else {
        toast.error("キャンセルに失敗しました");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("エラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {status === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Icon name="sync" size={48} className="mx-auto mb-4 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">予約情報を確認中...</p>
            </CardContent>
          </Card>
        )}

        {/* Not Found State */}
        {status === 'not_found' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Icon name="error_outline" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">予約が見つかりません</h2>
              <p className="text-muted-foreground mb-6">
                このリンクは無効か、既に期限切れです。
              </p>
              <Link to="/">
                <Button variant="outline">
                  トップページへ戻る
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Booking Found - Can Cancel */}
        {status === 'found' && booking && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">予約の変更・キャンセル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Icon name="person" size={20} className="text-muted-foreground" />
                  <span className="font-medium">{booking.customer_name} 様</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="calendar_today" size={20} className="text-muted-foreground" />
                  <span>
                    {format(new Date(booking.selected_date), "yyyy年M月d日(E)", { locale: ja })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="schedule" size={20} className="text-muted-foreground" />
                  <span>{booking.selected_time}〜</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="payments" size={20} className="text-muted-foreground" />
                  <span className="font-semibold">¥{booking.total_price.toLocaleString()}</span>
                </div>
              </div>

              {/* Reschedule Option */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="event_repeat" size={24} className="text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-primary mb-1">日時を変更する</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      別の日時に予約を変更できます。サービス内容はそのままです。
                    </p>
                    <Link to={`/reschedule/${token}`}>
                      <Button className="w-full">
                        <Icon name="calendar_month" size={18} className="mr-2" />
                        日時変更ページへ
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">または</span>
                </div>
              </div>

              {/* Cancel Option */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="warning" size={24} className="text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive mb-1">予約をキャンセル</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      一度キャンセルすると元に戻せません。再度ご予約が必要です。
                    </p>
                    <Button
                      onClick={handleCancel}
                      variant="destructive"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Icon name="sync" size={18} className="mr-2 animate-spin" />
                          キャンセル中...
                        </>
                      ) : (
                        <>
                          <Icon name="cancel" size={18} className="mr-2" />
                          この予約をキャンセルする
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                変更やキャンセルをしない場合はこのページを閉じてください
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cancelled State */}
        {status === 'cancelled' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={40} className="text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">キャンセルが完了しました</h2>
              <p className="text-muted-foreground mb-6">
                ご予約のキャンセルを承りました。<br />
                またのご利用をお待ちしております。
              </p>
              <Link to="/">
                <Button>
                  トップページへ戻る
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Already Cancelled State */}
        {status === 'already_cancelled' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Icon name="info" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">この予約は既にキャンセル済みです</h2>
              <p className="text-muted-foreground mb-6">
                この予約は以前にキャンセルされています。
              </p>
              <Link to="/">
                <Button variant="outline">
                  トップページへ戻る
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
