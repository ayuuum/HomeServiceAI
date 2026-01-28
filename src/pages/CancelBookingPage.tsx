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
          // Customer LINE notification
          supabase.functions.invoke('send-booking-notification', {
            body: { bookingId: booking.id, notificationType: 'cancelled' }
          }).catch(console.error);
          
          // Admin email notification
          supabase.functions.invoke('send-booking-email', {
            body: { 
              bookingId: booking.id, 
              emailType: 'admin_notification',
              adminNotificationType: 'cancelled'
            }
          }).catch(console.error);
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
              <CardTitle className="text-2xl">予約キャンセル</CardTitle>
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

              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="warning" size={20} className="text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">キャンセルについて</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      一度キャンセルすると元に戻すことはできません。再度ご予約が必要です。
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCancel}
                variant="destructive"
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="sync" size={20} className="mr-2 animate-spin" />
                    キャンセル中...
                  </>
                ) : (
                  <>
                    <Icon name="cancel" size={20} className="mr-2" />
                    この予約をキャンセルする
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                キャンセルしない場合はこのページを閉じてください
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
