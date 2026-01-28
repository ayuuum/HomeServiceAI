import { useMemo, useEffect, useState } from "react";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  getDay,
  isToday,
  getWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/booking";
import { cn } from "@/lib/utils";

interface WeeklyCalendarViewProps {
  weekStart: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onWeekChange: (newWeekStart: Date) => void;
  onDayClick: (day: Date, time?: string) => void;
}

// 営業時間帯（9:00〜18:00）
const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export function WeeklyCalendarView({
  weekStart,
  bookings,
  onBookingClick,
  onWeekChange,
  onDayClick,
}: WeeklyCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 現在時刻の更新（1分ごと）
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // 週の7日間を生成
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // 日付ごとの予約をマップ化
  const bookingsByDayAndTime = useMemo(() => {
    const map = new Map<string, Booking[]>();
    
    bookings.forEach((booking) => {
      const dateKey = format(new Date(booking.selectedDate), "yyyy-MM-dd");
      const timeKey = booking.selectedTime.slice(0, 5); // "HH:MM"形式に統一
      const key = `${dateKey}_${timeKey}`;
      
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(booking);
    });
    
    return map;
  }, [bookings]);

  const getBookingsForSlot = (day: Date, time: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const key = `${dateKey}_${time}`;
    return bookingsByDayAndTime.get(key) || [];
  };

  // 現在時刻のインジケーター位置を計算
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    if (hours < 9 || hours >= 19) return null;
    
    // 9時を0%、19時を100%として位置を計算
    const totalMinutes = (hours - 9) * 60 + minutes;
    const percentage = (totalMinutes / (10 * 60)) * 100;
    
    return percentage;
  };

  const timePosition = getCurrentTimePosition();
  const showTimeIndicator = isToday(weekDays[0]) || weekDays.some(d => isToday(d));

  const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-3">
      {/* 週ナビゲーション */}
      <div className="flex items-center justify-center gap-2 bg-card p-1 rounded-lg shadow-subtle border border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onWeekChange(subWeeks(weekStart, 1))} 
          className="hover:bg-muted h-8 w-8 md:h-9 md:w-9"
        >
          <Icon name="chevron_left" size={18} />
        </Button>
        <div className="text-base md:text-lg font-bold min-w-[200px] md:min-w-[280px] text-center">
          <span className="tabular-nums">
            {format(weekStart, "yyyy年M月", { locale: ja })} 第{weekNumber}週
          </span>
          <span className="text-sm text-muted-foreground ml-2 hidden md:inline">
            ({format(weekStart, "M/d")}〜{format(weekEnd, "M/d")})
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onWeekChange(addWeeks(weekStart, 1))} 
          className="hover:bg-muted h-8 w-8 md:h-9 md:w-9"
        >
          <Icon name="chevron_right" size={18} />
        </Button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Button 
          variant="ghost" 
          onClick={() => {
            const today = new Date();
            const dayOfWeek = getDay(today);
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            onWeekChange(addDays(today, mondayOffset));
          }} 
          className="text-xs md:text-sm font-medium hover:bg-muted px-2 md:px-3 h-8 md:h-9"
        >
          今週
        </Button>
      </div>

      {/* 週間グリッド */}
      <div className="bg-card rounded-lg border shadow-subtle overflow-hidden">
        {/* ヘッダー（曜日・日付） */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] md:grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="py-2 px-1 text-center text-xs text-muted-foreground border-r bg-muted/30">
            時間
          </div>
          {weekDays.map((day, index) => {
            const dayOfWeek = getDay(day);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "py-2 px-1 text-center border-r last:border-r-0",
                  isSunday && "bg-destructive/5",
                  isSaturday && "bg-primary/5",
                  isTodayDate && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "text-xs font-bold",
                  isSunday && "text-destructive",
                  isSaturday && "text-primary",
                  !isSunday && !isSaturday && "text-muted-foreground"
                )}>
                  {["日", "月", "火", "水", "木", "金", "土"][dayOfWeek]}
                </div>
                <div className={cn(
                  "text-sm md:text-base font-bold",
                  isTodayDate && "text-primary"
                )}>
                  {isTodayDate ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary text-primary-foreground">
                      {format(day, "d")}
                    </span>
                  ) : (
                    format(day, "d")
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間スロットグリッド */}
        <div className="relative">
          {/* 現在時刻インジケーター */}
          {showTimeIndicator && timePosition !== null && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${timePosition}%` }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <div className="flex-1 h-0.5 bg-destructive" />
              </div>
            </div>
          )}

          {TIME_SLOTS.map((time, timeIndex) => (
            <div
              key={time}
              className={cn(
                "grid grid-cols-[50px_repeat(7,1fr)] md:grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0",
                "min-h-[60px] md:min-h-[70px]"
              )}
            >
              {/* 時間ラベル */}
              <div className="py-1 px-1 text-center text-xs text-muted-foreground border-r bg-muted/30 flex items-start justify-center pt-1">
                {time}
              </div>

              {/* 各日のセル */}
              {weekDays.map((day) => {
                const dayOfWeek = getDay(day);
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const isTodayDate = isToday(day);
                const slotBookings = getBookingsForSlot(day, time);

                return (
                  <div
                    key={`${day.toString()}_${time}`}
                    onClick={() => {
                      if (slotBookings.length === 0) {
                        onDayClick(day, time);
                      }
                    }}
                    className={cn(
                      "p-0.5 border-r last:border-r-0 transition-colors",
                      isSunday && "bg-destructive/5",
                      isSaturday && "bg-primary/5",
                      isTodayDate && "bg-primary/10",
                      slotBookings.length === 0 && "hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className="space-y-0.5">
                      {slotBookings.map((booking) => (
                        <button
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick(booking);
                          }}
                          className={cn(
                            "w-full text-left px-1 py-0.5 md:px-1.5 md:py-1 rounded border transition-all hover:shadow-sm",
                            booking.status === "confirmed" && "bg-success/10 border-success/30 hover:bg-success/20",
                            booking.status === "cancelled" && "bg-muted border-border opacity-60",
                            booking.status === "pending" && "bg-warning/10 border-warning/30 hover:bg-warning/20"
                          )}
                        >
                          <div className="flex items-center gap-0.5 md:gap-1">
                            <span className={cn(
                              "font-semibold text-[10px] md:text-xs truncate",
                              booking.status === "confirmed" && "text-success",
                              booking.status === "pending" && "text-warning",
                              booking.status === "cancelled" && "text-muted-foreground"
                            )}>
                              {booking.customerName}
                            </span>
                            {booking.status === "pending" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate hidden md:block">
                            {booking.serviceName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
