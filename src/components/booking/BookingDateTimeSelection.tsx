import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DayAvailability, TimeSlotAvailability } from "@/hooks/useAvailability";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface BookingDateTimeSelectionProps {
    selectedDate: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
    selectedTime: string | undefined;
    onTimeSelect: (time: string) => void;
    hasParking: string;
    onParkingChange: (value: string) => void;
    timeSlots: string[];
    dayTimeSlots: TimeSlotAvailability[];
    getAvailabilityForDate: (date: Date) => DayAvailability | undefined;
    onMonthChange?: (date: Date) => void;
    loadingDay?: boolean;
    fetchDayAvailability?: (date: Date) => void;
}

// 曜日の日本語表記
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export const BookingDateTimeSelection = ({
    selectedDate,
    onDateSelect,
    selectedTime,
    onTimeSelect,
    hasParking,
    onParkingChange,
    timeSlots,
    dayTimeSlots,
    getAvailabilityForDate,
    onMonthChange,
    loadingDay,
    fetchDayAvailability,
}: BookingDateTimeSelectionProps) => {
    // 週の開始日（月曜始まり）
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        return startOfWeek(today, { weekStartsOn: 1 });
    });

    // 週内の日付（7日分）
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // 週ナビゲーション
    const goToPreviousWeek = () => {
        const newStart = addDays(weekStart, -7);
        setWeekStart(newStart);
        onMonthChange?.(newStart);
    };

    const goToNextWeek = () => {
        const newStart = addDays(weekStart, 7);
        setWeekStart(newStart);
        onMonthChange?.(newStart);
    };

    // 日付と時間を同時に選択
    const handleSlotSelect = (day: Date, time: string) => {
        const isPast = isBefore(day, startOfDay(new Date()));
        const availability = getAvailabilityForDate(day);
        
        if (isPast || availability?.status === "full") return;

        // 日付が変わった場合、その日の空き状況を取得
        if (!selectedDate || !isSameDay(selectedDate, day)) {
            onDateSelect(day);
            fetchDayAvailability?.(day);
        }
        
        onTimeSelect(time);
    };

    // 週が変わったときに月の空き状況を更新
    useEffect(() => {
        onMonthChange?.(weekStart);
    }, [weekStart, onMonthChange]);

    // 時間スロットの状態を取得
    const getSlotStatus = (day: Date, time: string): { available: boolean; isSelected: boolean } => {
        const isPast = isBefore(day, startOfDay(new Date()));
        const dayAvailability = getAvailabilityForDate(day);
        const isDayFull = dayAvailability?.status === "full";
        
        if (isPast || isDayFull) {
            return { available: false, isSelected: false };
        }

        // 選択中の日付の場合、dayTimeSlotsから状態を確認
        if (selectedDate && isSameDay(selectedDate, day)) {
            const slotInfo = dayTimeSlots.find(s => s.time === time);
            const isBooked = slotInfo?.isBooked ?? false;
            const isSelected = selectedTime === time;
            return { available: !isBooked, isSelected };
        }

        // 選択されていない日は空きありとして表示（詳細は選択時に取得）
        return { available: true, isSelected: false };
    };

    // 日の空き状況に基づく背景色
    const getDayHeaderClass = (day: Date): string => {
        const isPast = isBefore(day, startOfDay(new Date()));
        if (isPast) return "text-muted-foreground/40";
        
        const availability = getAvailabilityForDate(day);
        if (availability?.status === "full") return "text-muted-foreground/40";
        if (availability?.status === "partial") return "text-orange-600";
        return "text-foreground";
    };

    // 週の範囲表示
    const weekRangeText = `${format(weekStart, "M/d(E)", { locale: ja })} 〜 ${format(addDays(weekStart, 6), "M/d(E)", { locale: ja })}`;

    // 過去の週には戻れないようにする
    const canGoBack = !isBefore(addDays(weekStart, -1), startOfDay(new Date()));

    return (
        <div className="space-y-3">
            {/* 週間グリッドカレンダー */}
            <section>
                <div className="flex items-center gap-2 mb-2">
                    <Icon name="calendar_today" size={18} className="text-primary" />
                    <h3 className="text-base font-bold">日時を選択</h3>
                    <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-1.5 py-0">
                        必須
                    </Badge>
                </div>

                {/* 週ナビゲーション */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPreviousWeek}
                        disabled={!canGoBack}
                        className="h-7 w-7 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold">{weekRangeText}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToNextWeek}
                        className="h-7 w-7 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* グリッド */}
                <div className="overflow-x-auto border rounded-lg">
                    <div className="min-w-[320px]">
                        {/* ヘッダー行：時間列 + 7日分 */}
                        <div className="grid grid-cols-8 border-b bg-muted/50">
                            <div className="p-1 text-center text-xs font-medium border-r" />
                            {weekDays.map((day, idx) => {
                                const isPast = isBefore(day, startOfDay(new Date()));
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "p-1 text-center border-r last:border-r-0",
                                            getDayHeaderClass(day)
                                        )}
                                    >
                                        <div className={cn(
                                            "text-[10px] font-bold",
                                            idx === 5 && "text-blue-600",
                                            idx === 6 && "text-red-600",
                                            isPast && "text-muted-foreground/40"
                                        )}>
                                            {DAY_NAMES[day.getDay()]}
                                        </div>
                                        <div className={cn(
                                            "text-sm font-bold",
                                            isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto",
                                            isPast && !isToday && "text-muted-foreground/40"
                                        )}>
                                            {day.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 時間行 */}
                        {timeSlots.map((time, timeIdx) => (
                            <div key={time} className={cn("grid grid-cols-8", timeIdx !== timeSlots.length - 1 && "border-b")}>
                                <div className="p-1 text-center text-xs font-medium border-r bg-muted/30 flex items-center justify-center">
                                    {time}
                                </div>
                                {weekDays.map((day, dayIdx) => {
                                    const { available, isSelected } = getSlotStatus(day, time);
                                    const isPast = isBefore(day, startOfDay(new Date()));
                                    const dayAvailability = getAvailabilityForDate(day);
                                    const isDayFull = dayAvailability?.status === "full";
                                    
                                    return (
                                        <button
                                            key={dayIdx}
                                            onClick={() => handleSlotSelect(day, time)}
                                            disabled={isPast || isDayFull || !available}
                                            className={cn(
                                                "h-8 border-r last:border-r-0 transition-all touch-manipulation",
                                                // 選択中
                                                isSelected && "bg-primary text-primary-foreground",
                                                // 空きあり（選択なし）
                                                !isSelected && available && !isPast && !isDayFull && "hover:bg-primary/10",
                                                // 予約済み・過去
                                                (!available || isPast || isDayFull) && "bg-muted/50 cursor-not-allowed"
                                            )}
                                        >
                                            {isSelected && (
                                                <Icon name="check" size={14} className="mx-auto" />
                                            )}
                                            {(!available || isDayFull) && !isPast && !isSelected && (
                                                <span className="text-[10px] text-muted-foreground">×</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 凡例 */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border rounded bg-background" />
                        <span>空き</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border rounded bg-primary" />
                        <span>選択中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border rounded bg-muted/50 flex items-center justify-center text-[10px]">×</div>
                        <span>予約済</span>
                    </div>
                </div>

                {loadingDay && (
                    <p className="text-xs text-center text-muted-foreground mt-1">読み込み中...</p>
                )}
            </section>

            {/* Parking Selection */}
            {selectedDate && selectedTime && (
                <section>
                    <Separator className="mb-3" />
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="local_parking" size={18} className="text-primary" />
                        <h3 className="text-base font-bold">駐車場</h3>
                        <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-1.5 py-0">
                            必須
                        </Badge>
                    </div>

                    <RadioGroup value={hasParking} onValueChange={onParkingChange} className="space-y-1.5">
                        <div className={cn(
                            "flex items-center space-x-3 p-2.5 rounded-lg border-2 border-dashed touch-manipulation transition-all",
                            hasParking === "yes" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50"
                        )}>
                            <RadioGroupItem value="yes" id="parking-yes" className="h-4 w-4" />
                            <Label htmlFor="parking-yes" className="cursor-pointer flex-1 text-sm font-semibold">
                                駐車場あり
                            </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-3 p-2.5 rounded-lg border-2 border-dashed touch-manipulation transition-all",
                            hasParking === "no" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50"
                        )}>
                            <RadioGroupItem value="no" id="parking-no" className="h-4 w-4" />
                            <Label htmlFor="parking-no" className="cursor-pointer flex-1 text-sm font-semibold">
                                駐車場なし
                            </Label>
                        </div>
                    </RadioGroup>
                </section>
            )}
        </div>
    );
};
