import { useMemo, useEffect, useState, useCallback } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Booking } from "@/types/booking";
import { cn } from "@/lib/utils";
import { SlotActionPopover } from "./SlotActionPopover";
import { useScheduleBlocks } from "@/hooks/useScheduleBlocks";
import { TimeSlotAvailability } from "@/hooks/useAvailability";

interface WeeklyCalendarViewProps {
  weekStart: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onWeekChange: (newWeekStart: Date) => void;
  onDayClick: (day: Date, time?: string) => void;
  weekTimeSlots?: Record<string, TimeSlotAvailability[]>;
  onBlockChange?: () => void;
}

// 営業時間帯（9:00〜18:00）
const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

interface DragSlot {
  day: Date;
  time: string;
  dateStr: string;
}

export function WeeklyCalendarView({
  weekStart,
  bookings,
  onBookingClick,
  onWeekChange,
  onDayClick,
  weekTimeSlots,
  onBlockChange,
}: WeeklyCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const { createBlock, createMultipleBlocks, deleteBlock, loading: blockLoading } = useScheduleBlocks();

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragSlot | null>(null);
  const [dragEnd, setDragEnd] = useState<DragSlot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 現在時刻の更新（1分ごと）
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Global mouse up listener for drag end
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd) {
        const slots = getSelectedSlots();
        if (slots.length > 0) {
          setShowConfirmDialog(true);
        }
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, dragStart, dragEnd]);

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

  // Calculate selected slots from drag range
  const getSelectedSlots = useCallback((): DragSlot[] => {
    if (!dragStart || !dragEnd) return [];

    const slots: DragSlot[] = [];
    const startDayIndex = weekDays.findIndex(d => isSameDay(d, dragStart.day));
    const endDayIndex = weekDays.findIndex(d => isSameDay(d, dragEnd.day));
    const startTimeIndex = TIME_SLOTS.indexOf(dragStart.time);
    const endTimeIndex = TIME_SLOTS.indexOf(dragEnd.time);

    const minDayIndex = Math.min(startDayIndex, endDayIndex);
    const maxDayIndex = Math.max(startDayIndex, endDayIndex);
    const minTimeIndex = Math.min(startTimeIndex, endTimeIndex);
    const maxTimeIndex = Math.max(startTimeIndex, endTimeIndex);

    for (let dayIdx = minDayIndex; dayIdx <= maxDayIndex; dayIdx++) {
      for (let timeIdx = minTimeIndex; timeIdx <= maxTimeIndex; timeIdx++) {
        const day = weekDays[dayIdx];
        const time = TIME_SLOTS[timeIdx];
        const dateStr = format(day, "yyyy-MM-dd");
        
        // Only include slots that are not already booked or blocked
        const slotBookings = getBookingsForSlot(day, time);
        const slotInfo = getSlotInfo(day, time);
        
        if (slotBookings.length === 0 && !slotInfo?.isBlocked) {
          slots.push({ day, time, dateStr });
        }
      }
    }

    return slots;
  }, [dragStart, dragEnd, weekDays, getBookingsForSlot, getSlotInfo]);

  const selectedSlots = useMemo(() => getSelectedSlots(), [getSelectedSlots]);

  const isSlotInSelection = (day: Date, time: string): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    return selectedSlots.some(s => isSameDay(s.day, day) && s.time === time);
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

  const handleBlockSlot = async (day: Date, time: string) => {
    const dateStr = format(day, "yyyy-MM-dd");
    await createBlock(dateStr, time);
    onBlockChange?.();
  };

  const handleBlockAllDay = async (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    await createBlock(dateStr, null, "holiday");
    onBlockChange?.();
  };

  const handleUnblockSlot = async (blockId: string) => {
    await deleteBlock(blockId);
    onBlockChange?.();
  };

  const handleConfirmBulkBlock = async () => {
    const slots = selectedSlots.map(s => ({
      date: s.dateStr,
      time: s.time
    }));
    
    const success = await createMultipleBlocks(slots);
    if (success) {
      onBlockChange?.();
    }
    
    setShowConfirmDialog(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleCancelBulkBlock = () => {
    setShowConfirmDialog(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Drag handlers
  const handleMouseDown = (day: Date, time: string, e: React.MouseEvent) => {
    // Only start drag on empty cells
    const slotBookings = getBookingsForSlot(day, time);
    const slotInfo = getSlotInfo(day, time);
    
    if (slotBookings.length === 0 && !slotInfo?.isBlocked) {
      e.preventDefault();
      const dateStr = format(day, "yyyy-MM-dd");
      setIsDragging(true);
      setDragStart({ day, time, dateStr });
      setDragEnd({ day, time, dateStr });
      setOpenPopover(null);
    }
  };

  const handleMouseEnter = (day: Date, time: string) => {
    if (isDragging) {
      const dateStr = format(day, "yyyy-MM-dd");
      setDragEnd({ day, time, dateStr });
    }
  };

  const timePosition = getCurrentTimePosition();
  const showTimeIndicator = isToday(weekDays[0]) || weekDays.some(d => isToday(d));

  const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-3">
      {/* Bulk Block Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>選択したスロットをブロック</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSlots.length}件のスロットをブロックします。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-40 overflow-y-auto bg-muted/50 rounded-lg p-3 text-sm">
            {selectedSlots.slice(0, 10).map((slot, idx) => (
              <div key={idx} className="py-0.5">
                {format(slot.day, "M/d(E)", { locale: ja })} {slot.time}
              </div>
            ))}
            {selectedSlots.length > 10 && (
              <div className="text-muted-foreground pt-1">...他{selectedSlots.length - 10}件</div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelBulkBlock}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkBlock} disabled={blockLoading}>
              {blockLoading ? "処理中..." : "ブロックする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* ドラッグ操作のヒント */}
      <div className="text-xs text-muted-foreground text-center">
        💡 空きセルをドラッグで複数選択してまとめてブロックできます
      </div>

      {/* 週間グリッド */}
      <div 
        className="bg-card rounded-lg border shadow-subtle overflow-hidden select-none"
        onMouseLeave={() => {
          if (isDragging) {
            // Keep selection when leaving the grid
          }
        }}
      >
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
                const slotInfo = getSlotInfo(day, time);
                const isBlocked = slotInfo?.isBlocked ?? false;
                const popoverKey = `${format(day, "yyyy-MM-dd")}_${time}`;
                const hasBookings = slotBookings.length > 0;
                const inSelection = isSlotInSelection(day, time);

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
                            setOpenPopover(null);
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

                // 空きセル（ドラッグ選択 or ポップオーバー）
                return (
                  <div
                    key={popoverKey}
                    onMouseDown={(e) => handleMouseDown(day, time, e)}
                    onMouseEnter={() => handleMouseEnter(day, time)}
                    onClick={() => {
                      if (!isDragging) {
                        setOpenPopover(openPopover === popoverKey ? null : popoverKey);
                      }
                    }}
                    className={cn(
                      "p-0.5 border-r last:border-r-0 transition-colors h-full cursor-pointer relative",
                      inSelection && "bg-primary/30 ring-2 ring-inset ring-primary/50",
                      !inSelection && isSunday && "bg-destructive/5 hover:bg-destructive/10",
                      !inSelection && isSaturday && "bg-primary/5 hover:bg-primary/10",
                      !inSelection && isTodayDate && "bg-primary/10 hover:bg-primary/20",
                      !inSelection && !isSunday && !isSaturday && !isTodayDate && "hover:bg-muted/50"
                    )}
                  >
                    {/* Popover for single click */}
                    {!isDragging && openPopover === popoverKey && (
                      <SlotActionPopover
                        day={day}
                        time={time}
                        isOpen={true}
                        onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}
                        onAddBooking={() => onDayClick(day, time)}
                        onBlockSlot={() => handleBlockSlot(day, time)}
                        onBlockAllDay={() => handleBlockAllDay(day)}
                      >
                        <div className="absolute inset-0" />
                      </SlotActionPopover>
                    )}
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
