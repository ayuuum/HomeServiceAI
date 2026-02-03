import { useMemo, useEffect, useState } from "react";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  getDay,
  isToday,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Booking } from "@/types/booking";
import { cn } from "@/lib/utils";
import { SlotActionPopover } from "./SlotActionPopover";
import { useScheduleBlocks } from "@/hooks/useScheduleBlocks";
import { TimeSlotAvailability } from "@/hooks/useAvailability";
import { BusinessHours, getAllTimeSlots, isClosedDay } from "@/types/businessHours";

interface WeeklyCalendarViewProps {
  weekStart: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onWeekChange: (newWeekStart: Date) => void;
  onDayClick: (day: Date, time?: string) => void;
  weekTimeSlots?: Record<string, TimeSlotAvailability[]>;
  onBlockChange?: () => void;
  businessHours?: BusinessHours | null;
}

export function WeeklyCalendarView({
  weekStart,
  bookings,
  onBookingClick,
  onWeekChange,
  onDayClick,
  weekTimeSlots,
  onBlockChange,
  businessHours,
}: WeeklyCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const { createBlock, deleteBlock, loading: blockLoading } = useScheduleBlocks();

  // Get all time slots based on business hours (union of all days)
  const TIME_SLOTS = useMemo(() => {
    return getAllTimeSlots(businessHours);
  }, [businessHours]);

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

  const getSlotInfo = (day: Date, time: string): TimeSlotAvailability | undefined => {
    if (!weekTimeSlots) return undefined;
    const dateStr = format(day, "yyyy-MM-dd");
    const daySlots = weekTimeSlots[dateStr];
    return daySlots?.find(s => s.time === time);
  };

  // Check if a day is closed based on business hours
  const isDayClosed = (day: Date): boolean => {
    return isClosedDay(businessHours, getDay(day));
  };

  // Check if a time slot exists for a given day (based on business hours)
  const isSlotInBusinessHours = (day: Date, time: string): boolean => {
    const dateStr = format(day, "yyyy-MM-dd");
    const daySlots = weekTimeSlots?.[dateStr];
    if (!daySlots) return true; // Default to showing if no data yet
    return daySlots.some(s => s.time === time);
  };

  // 現在時刻のインジケーター位置を計算
  const getCurrentTimePosition = () => {
    if (TIME_SLOTS.length === 0) return null;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    // Parse first and last time slot
    const [firstHour] = TIME_SLOTS[0].split(":").map(Number);
    const [lastHour] = TIME_SLOTS[TIME_SLOTS.length - 1].split(":").map(Number);
    const endHour = lastHour + 1; // Assuming 1 hour slots

    if (hours < firstHour || hours >= endHour) return null;

    // Calculate position as percentage
    const totalMinutes = (hours - firstHour) * 60 + minutes;
    const totalRange = (endHour - firstHour) * 60;
    const percentage = (totalMinutes / totalRange) * 100;

    return percentage;
  };

  const handleBlockSlot = async (day: Date, time: string) => {
    const dateStr = format(day, "yyyy-MM-dd");
    await createBlock(dateStr, time);
    setOpenPopover(null);
    onBlockChange?.();
  };

  const handleBlockAllDay = async (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    await createBlock(dateStr, null, "holiday");
    setOpenPopover(null);
    onBlockChange?.();
  };

  const handleUnblockSlot = async (blockId: string) => {
    await deleteBlock(blockId);
    setOpenPopover(null);
    onBlockChange?.();
  };

  const timePosition = getCurrentTimePosition();
  const showTimeIndicator = isToday(weekDays[0]) || weekDays.some(d => isToday(d));

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
            {format(weekStart, "M月d日", { locale: ja })}〜{format(weekEnd, "M月d日", { locale: ja })}
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
          {weekDays.map((day) => {
            const dayOfWeek = getDay(day);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isTodayDate = isToday(day);
            const isClosed = isDayClosed(day);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "py-2 px-1 text-center border-r last:border-r-0",
                  isClosed && "bg-muted/50",
                  isSunday && !isClosed && "bg-destructive/5",
                  isSaturday && !isClosed && "bg-primary/5",
                  isTodayDate && !isClosed && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "text-xs font-bold",
                  isClosed && "text-muted-foreground",
                  isSunday && !isClosed && "text-destructive",
                  isSaturday && !isClosed && "text-primary",
                  !isSunday && !isSaturday && !isClosed && "text-muted-foreground"
                )}>
                  {["日", "月", "火", "水", "木", "金", "土"][dayOfWeek]}
                  {isClosed && <span className="ml-1 text-[10px]">休</span>}
                </div>
                <div className={cn(
                  "text-sm md:text-base font-bold",
                  isTodayDate && "text-primary",
                  isClosed && "text-muted-foreground"
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

          {TIME_SLOTS.map((time) => (
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
                const slotInfo = getSlotInfo(day, time);
                const isBlocked = slotInfo?.isBlocked ?? false;
                const popoverKey = `${format(day, "yyyy-MM-dd")}_${time}`;
                const hasBookings = slotBookings.length > 0;
                const isClosed = isDayClosed(day);
                const isOutsideBusinessHours = !isSlotInBusinessHours(day, time);

                // 定休日または営業時間外のセル表示
                if (isClosed || isOutsideBusinessHours) {
                  return (
                    <div
                      key={popoverKey}
                      className="p-0.5 border-r last:border-r-0 bg-muted/40"
                      style={{
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.05) 4px, hsl(var(--muted-foreground) / 0.05) 8px)",
                      }}
                    />
                  );
                }

                // ブロック済みセルの表示（クリックで解除可能）
                if (isBlocked && !hasBookings) {
                  const blockId = slotInfo?.blockInfo?.id;
                  return (
                    <Popover key={popoverKey} open={openPopover === `unblock_${popoverKey}`} onOpenChange={(open) => setOpenPopover(open ? `unblock_${popoverKey}` : null)}>
                      <PopoverTrigger asChild>
                        <div
                          className={cn(
                            "p-0.5 border-r last:border-r-0 relative cursor-pointer hover:bg-muted/80 transition-colors",
                            "bg-muted/60"
                          )}
                          style={{
                            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.1) 4px, hsl(var(--muted-foreground) / 0.1) 8px)",
                          }}
                        >
                          <div className="flex items-center justify-center h-full">
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Icon name="block" size={14} />
                              <span className="hidden md:inline">
                                {slotInfo?.blockInfo?.title || "ブロック"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="center" side="bottom" sideOffset={4}>
                        <div className="text-xs text-muted-foreground mb-2 px-2">
                          {format(day, "M月d日(E)", { locale: ja })} {time}
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 h-9 text-primary hover:text-primary"
                          onClick={async () => {
                            if (blockId) {
                              await handleUnblockSlot(blockId);
                            }
                          }}
                          disabled={blockLoading}
                        >
                          <Icon name="lock_open" size={18} />
                          <span>ブロックを解除</span>
                        </Button>
                      </PopoverContent>
                    </Popover>
                  );
                }

                // 予約ありセル
                if (hasBookings) {
                  return (
                    <div
                      key={popoverKey}
                      className={cn(
                        "p-0.5 border-r last:border-r-0 transition-colors overflow-hidden",
                        isSunday && "bg-destructive/5",
                        isSaturday && "bg-primary/5",
                        isTodayDate && "bg-primary/10"
                      )}
                    >
                      <div className="space-y-0.5 min-w-0">
                        {slotBookings.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                            className={cn(
                              "w-full text-left px-1 py-0.5 md:px-1.5 md:py-1 rounded border transition-all hover:shadow-sm overflow-hidden",
                              booking.status === "confirmed" && "bg-success/10 border-success/30 hover:bg-success/20",
                              booking.status === "cancelled" && "bg-muted border-border opacity-60",
                              booking.status === "pending" && "bg-warning/10 border-warning/30 hover:bg-warning/20"
                            )}
                          >
                            <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
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
                }

                // 空きセル（クリック → ポップオーバー）
                return (
                  <SlotActionPopover
                    key={popoverKey}
                    day={day}
                    time={time}
                    isOpen={openPopover === popoverKey}
                    onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}
                    onAddBooking={() => {
                      onDayClick(day, time);
                      setOpenPopover(null);
                    }}
                    onBlockSlot={() => handleBlockSlot(day, time)}
                    onBlockAllDay={() => handleBlockAllDay(day)}
                  >
                    <div
                      className={cn(
                        "p-0.5 border-r last:border-r-0 transition-colors h-full cursor-pointer",
                        isSunday && "bg-destructive/5 hover:bg-destructive/10",
                        isSaturday && "bg-primary/5 hover:bg-primary/10",
                        isTodayDate && "bg-primary/10 hover:bg-primary/20",
                        !isSunday && !isSaturday && !isTodayDate && "hover:bg-muted/50"
                      )}
                    />
                  </SlotActionPopover>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
