import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, getDay, isSameDay, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PageStatus = 'loading' | 'found' | 'not_found' | 'already_cancelled' | 'success';

interface BookingInfo {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  selected_date: string;
  selected_time: string;
  total_price: number;
  status: string;
  organization_id: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function RescheduleBookingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Week selection state
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = getDay(today);
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return addDays(today, mondayOffset);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, TimeSlot[]>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  useEffect(() => {
    fetchBooking();
  }, [token]);

  useEffect(() => {
    if (booking?.organization_id) {
      fetchAvailability();
    }
  }, [weekStart, booking?.organization_id]);

  const fetchBooking = async () => {
    if (!token) {
      setStatus('not_found');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_booking_by_cancel_token', {
        p_token: token
      });

      if (error || !data || data.length === 0) {
        setStatus('not_found');
        return;
      }

      const bookingData = data[0] as BookingInfo;
      setBooking(bookingData);

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

  const fetchAvailability = async () => {
    if (!booking?.organization_id) return;

    setLoadingAvailability(true);
    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke('get-availability', {
        body: {
          organizationId: booking.organization_id,
          startDate,
          endDate,
          excludeBookingId: booking.id, // Exclude current booking from availability calc
        }
      });

      if (error) throw error;
      if (data?.availability) {
        setAvailability(data.availability);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleReschedule = async () => {
    if (!token || !selectedDate || !selectedTime || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const newDate = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase.rpc('reschedule_booking_by_token', {
        p_token: token,
        p_new_date: newDate,
        p_new_time: selectedTime
      });

      if (error) {
        console.error("Reschedule error:", error);
        toast.error("日時変更に失敗しました");
        setIsSubmitting(false);
        return;
      }

      if (data) {
        setStatus('success');
        toast.success("予約日時を変更しました");

        // Send notifications
        if (booking) {
          supabase.functions.invoke('send-booking-email', {
            body: { 
              bookingId: booking.id, 
              emailType: 'reschedule',
              oldDate: booking.selected_date,
              oldTime: booking.selected_time,
              newDate,
              newTime: selectedTime
            }
          }).catch(console.error);

          // Admin notification
          supabase
            .from('notifications')
            .insert({
              organization_id: booking.organization_id,
              type: 'booking_rescheduled',
              title: `${booking.customer_name}様が予約日時を変更`,
              message: `${format(new Date(booking.selected_date), "M/d", { locale: ja })} ${booking.selected_time} → ${format(selectedDate, "M/d", { locale: ja })} ${selectedTime}`,
              resource_type: 'booking',
              resource_id: booking.id
            })
            .then(({ error }) => {
              if (error) console.error('Notification insert error:', error);
            });
        }
      } else {
        toast.error("日時変更に失敗しました");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("エラーが発生しました");
      setIsSubmitting(false);
    }
  };

  const getSlotAvailability = (day: Date, time: string): boolean => {
    const dateStr = format(day, "yyyy-MM-dd");
    const daySlots = availability[dateStr];
    if (!daySlots) return true; // Default to available if no data
    const slot = daySlots.find(s => s.time === time);
    return slot?.available ?? true;
  };

  const isCurrentBookingSlot = (day: Date, time: string): boolean => {
    if (!booking) return false;
    return format(day, "yyyy-MM-dd") === booking.selected_date && time === booking.selected_time;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
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
                <Button variant="outline">トップページへ戻る</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Already Cancelled */}
        {status === 'already_cancelled' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Icon name="info" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">この予約は既にキャンセル済みです</h2>
              <p className="text-muted-foreground mb-6">
                日時変更はできません。新しくご予約ください。
              </p>
              <Link to="/">
                <Button variant="outline">トップページへ戻る</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {status === 'success' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={40} className="text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">日時変更が完了しました</h2>
              <p className="text-muted-foreground mb-2">
                新しい予約日時:
              </p>
              <p className="text-lg font-bold mb-6">
                {selectedDate && format(selectedDate, "yyyy年M月d日(E)", { locale: ja })} {selectedTime}〜
              </p>
              <Link to="/">
                <Button>トップページへ戻る</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Main Reschedule Form */}
        {status === 'found' && booking && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">予約日時の変更</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">現在の予約</p>
                  <div className="flex items-center gap-3">
                    <Icon name="person" size={20} className="text-muted-foreground" />
                    <span className="font-medium">{booking.customer_name} 様</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="calendar_today" size={20} className="text-muted-foreground" />
                    <span>{format(new Date(booking.selected_date), "yyyy年M月d日(E)", { locale: ja })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="schedule" size={20} className="text-muted-foreground" />
                    <span>{booking.selected_time}〜</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Link to={`/cancel/${token}`}>
                    <Button variant="outline" size="sm">
                      <Icon name="cancel" size={16} className="mr-1" />
                      キャンセルする場合はこちら
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">新しい日時を選択</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Week Navigation */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                  >
                    <Icon name="chevron_left" size={20} />
                  </Button>
                  <span className="font-medium min-w-[180px] text-center">
                    {format(weekStart, "yyyy年M月d日", { locale: ja })} 〜
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                  >
                    <Icon name="chevron_right" size={20} />
                  </Button>
                </div>

                {/* Week Grid */}
                <div className="border rounded-lg overflow-hidden">
                  {/* Day Headers */}
                  <div className="grid grid-cols-8 border-b bg-muted/30">
                    <div className="p-2 text-center text-xs text-muted-foreground border-r">時間</div>
                    {weekDays.map((day) => {
                      const dayOfWeek = getDay(day);
                      const isSunday = dayOfWeek === 0;
                      const isSaturday = dayOfWeek === 6;
                      return (
                        <div
                          key={day.toString()}
                          className={cn(
                            "p-2 text-center border-r last:border-r-0",
                            isSunday && "bg-destructive/5",
                            isSaturday && "bg-primary/5"
                          )}
                        >
                          <div className={cn(
                            "text-xs font-bold",
                            isSunday && "text-destructive",
                            isSaturday && "text-primary"
                          )}>
                            {["日", "月", "火", "水", "木", "金", "土"][dayOfWeek]}
                          </div>
                          <div className={cn(
                            "text-sm font-bold",
                            isToday(day) && "text-primary"
                          )}>
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time Slots */}
                  {loadingAvailability ? (
                    <div className="py-8 text-center">
                      <Icon name="sync" size={24} className="animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : (
                    TIME_SLOTS.map((time) => (
                      <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                        <div className="p-2 text-center text-xs text-muted-foreground border-r bg-muted/30">
                          {time}
                        </div>
                        {weekDays.map((day) => {
                          const isAvailable = getSlotAvailability(day, time);
                          const isCurrent = isCurrentBookingSlot(day, time);
                          const isSelected = selectedDate && isSameDay(selectedDate, day) && selectedTime === time;
                          const isPast = day < new Date() && !isToday(day);

                          return (
                            <button
                              key={`${day.toString()}_${time}`}
                              onClick={() => {
                                if (isAvailable && !isPast && !isCurrent) {
                                  setSelectedDate(day);
                                  setSelectedTime(time);
                                }
                              }}
                              disabled={!isAvailable || isPast || isCurrent}
                              className={cn(
                                "p-2 border-r last:border-r-0 transition-colors min-h-[44px]",
                                isSelected && "bg-primary text-primary-foreground",
                                isCurrent && "bg-warning/20 text-warning-foreground",
                                !isAvailable && !isCurrent && "bg-muted/50 text-muted-foreground",
                                isAvailable && !isPast && !isCurrent && !isSelected && "hover:bg-primary/10 cursor-pointer",
                                isPast && "bg-muted/30 text-muted-foreground cursor-not-allowed"
                              )}
                            >
                              {isCurrent && (
                                <span className="text-xs">現在</span>
                              )}
                              {isSelected && (
                                <Icon name="check" size={16} />
                              )}
                              {!isAvailable && !isCurrent && (
                                <span className="text-xs">×</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Selected Summary & Submit */}
                {selectedDate && selectedTime && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">変更後の日時</p>
                    <p className="text-lg font-bold text-primary mb-4">
                      {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })} {selectedTime}〜
                    </p>
                    <Button
                      onClick={handleReschedule}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Icon name="sync" size={20} className="mr-2 animate-spin" />
                          変更中...
                        </>
                      ) : (
                        <>
                          <Icon name="event_available" size={20} className="mr-2" />
                          この日時に変更する
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
