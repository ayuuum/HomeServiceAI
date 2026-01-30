import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DayAvailability, TimeSlotAvailability, WeekTimeSlotAvailability } from "@/hooks/useAvailability";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";

export interface DateTimePreference {
    date: Date | undefined;
    time: string | undefined;
}

interface BookingDateTimeSelectionProps {
    preferences: DateTimePreference[];
    onPreferencesChange: (preferences: DateTimePreference[]) => void;
    hasParking: string;
    onParkingChange: (value: string) => void;
    timeSlots: string[];
    dayTimeSlots: TimeSlotAvailability[];
    weekTimeSlots: WeekTimeSlotAvailability;
    getAvailabilityForDate: (date: Date) => DayAvailability | undefined;
    onMonthChange?: (date: Date) => void;
    loadingDay?: boolean;
    loadingWeek?: boolean;
    fetchDayAvailability?: (date: Date) => void;
    fetchWeekAvailability?: (weekStart: Date) => void;
    prefetchAdjacentWeeks?: (weekStart: Date) => void;
    organizationId?: string;
}

// 曜日の日本語表記
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const PREFERENCE_LABELS = ["第1希望", "第2希望", "第3希望"];

export const BookingDateTimeSelection = ({
    preferences,
    onPreferencesChange,
    hasParking,
    onParkingChange,
    timeSlots,
    dayTimeSlots,
    weekTimeSlots,
    getAvailabilityForDate,
    onMonthChange,
    loadingDay,
    loadingWeek,
    fetchDayAvailability,
    fetchWeekAvailability,
    prefetchAdjacentWeeks,
    organizationId,
}: BookingDateTimeSelectionProps) => {
    // 現在編集中の希望番号 (0, 1, 2)
    const [editingPreference, setEditingPreference] = useState<number>(0);

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
        const dateStr = format(day, "yyyy-MM-dd");
        const slotInfo = weekTimeSlots[dateStr]?.find(s => s.time === time);

        if (isPast || slotInfo?.isBooked) return;

        // 同じ日時が既に他の希望で選択されていないかチェック
        const isDuplicate = preferences.some((pref, idx) =>
            idx !== editingPreference &&
            pref.date &&
            isSameDay(pref.date, day) &&
            pref.time === time
        );

        if (isDuplicate) {
            return; // 重複する日時は選択不可
        }

        const newPreferences = [...preferences];
        newPreferences[editingPreference] = { date: day, time };
        onPreferencesChange(newPreferences);

        // 次の未選択の希望に自動移動
        if (editingPreference < 2) {
            const nextEmpty = newPreferences.findIndex((p, idx) => idx > editingPreference && (!p.date || !p.time));
            if (nextEmpty !== -1) {
                setEditingPreference(nextEmpty);
            }
        }
    };

    // 希望を削除
    const handleRemovePreference = (index: number) => {
        const newPreferences = [...preferences];
        newPreferences[index] = { date: undefined, time: undefined };
        onPreferencesChange(newPreferences);
        setEditingPreference(index);
    };

    // 週が変わったとき、または組織IDが取得されたときに空き状況を取得
    useEffect(() => {
        if (organizationId) {
            onMonthChange?.(weekStart);
            fetchWeekAvailability?.(weekStart);
        }
    }, [weekStart, organizationId, onMonthChange, fetchWeekAvailability]);

    // データ取得後に隣接週を先読み
    useEffect(() => {
        if (organizationId && Object.keys(weekTimeSlots).length > 0) {
            prefetchAdjacentWeeks?.(weekStart);
        }
    }, [weekTimeSlots, weekStart, organizationId, prefetchAdjacentWeeks]);

    // 時間スロットの状態を取得
    const getSlotStatus = (day: Date, time: string): {
        available: boolean;
        isSelected: boolean;
        isBooked: boolean;
        isBlocked: boolean;
        selectedByOther: boolean;
    } => {
        const isPast = isBefore(day, startOfDay(new Date()));
        const dateStr = format(day, "yyyy-MM-dd");

        if (isPast) {
            return { available: false, isSelected: false, isBooked: false, isBlocked: false, selectedByOther: false };
        }

        // weekTimeSlotsから予約状況を取得
        const slotInfo = weekTimeSlots[dateStr]?.find(s => s.time === time);
        const isBooked = slotInfo?.isBooked ?? false;
        const isBlocked = slotInfo?.isBlocked ?? false;

        // 現在編集中の希望で選択中かどうか
        const currentPref = preferences[editingPreference];
        const isSelected = currentPref?.date && isSameDay(currentPref.date, day) && currentPref.time === time;

        // 他の希望で選択済みかどうか
        const selectedByOther = preferences.some((pref, idx) =>
            idx !== editingPreference &&
            pref.date &&
            isSameDay(pref.date, day) &&
            pref.time === time
        );

        return { available: !isBooked && !isBlocked && !selectedByOther, isSelected: !!isSelected, isBooked, isBlocked, selectedByOther };
    };

    // 週の範囲表示
    const weekRangeText = `${format(weekStart, "M/d(E)", { locale: ja })} 〜 ${format(addDays(weekStart, 6), "M/d(E)", { locale: ja })}`;

    // 過去の週には戻れないようにする
    const canGoBack = !isBefore(addDays(weekStart, -1), startOfDay(new Date()));

    // 第1希望が設定されているかどうか
    const hasFirstPreference = preferences[0]?.date && preferences[0]?.time;

    return (
        <div className="space-y-4">
            {/* 希望日時の選択状態表示 */}
            <section className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    <Icon name="calendar_today" size={18} className="text-primary" />
                    <h3 className="text-base font-bold">希望日時を選択（3つまで）</h3>
                </div>

                <div className="grid gap-2">
                    {preferences.map((pref, index) => {
                        const isSelected = pref.date && pref.time;
                        const isEditing = editingPreference === index;
                        const isRequired = index === 0;

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer",
                                    isEditing ? "border-primary bg-primary/5" : "border-border",
                                    isSelected && !isEditing && "bg-muted/50"
                                )}
                                onClick={() => setEditingPreference(index)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-sm font-bold",
                                        isEditing ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {PREFERENCE_LABELS[index]}
                                    </span>
                                    {isRequired && (
                                        <Badge className="bg-destructive text-white hover:bg-destructive text-[10px] px-1 py-0">
                                            必須
                                        </Badge>
                                    )}
                                    {!isRequired && !isSelected && (
                                        <span className="text-xs text-muted-foreground">任意</span>
                                    )}
                                </div>

                                {isSelected ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {format(pref.date!, "M/d(E)", { locale: ja })} {pref.time}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-destructive/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePreference(index);
                                            }}
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        {isEditing ? "↓ 下のカレンダーから選択" : "タップして選択"}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className="text-xs text-muted-foreground text-center mt-2">
                    💡 複数の候補を登録すると、予約が取りやすくなります
                </p>
            </section>

            {/* 週間グリッドカレンダー */}
            <section>
                <div className="bg-primary/5 rounded-lg p-2 mb-2 text-center">
                    <span className="text-sm font-bold text-primary">
                        {PREFERENCE_LABELS[editingPreference]}を選択中
                    </span>
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
                                const isSaturday = day.getDay() === 6;
                                const isSunday = day.getDay() === 0;
                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "p-1 text-center border-r last:border-r-0",
                                            isSaturday && "bg-blue-50",
                                            isSunday && "bg-pink-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "text-[10px] font-bold",
                                            isSaturday && "text-blue-600",
                                            isSunday && "text-red-600",
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
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const hasData = weekTimeSlots[dateStr] !== undefined;
                                    const { available, isSelected, isBooked, isBlocked, selectedByOther } = getSlotStatus(day, time);
                                    const isPast = isBefore(day, startOfDay(new Date()));
                                    const isSaturday = day.getDay() === 6;
                                    const isSunday = day.getDay() === 0;

                                    // 他の希望で選択されているかどうかをチェック
                                    const otherPreferenceIndex = preferences.findIndex((pref, idx) =>
                                        idx !== editingPreference &&
                                        pref.date &&
                                        isSameDay(pref.date, day) &&
                                        pref.time === time
                                    );

                                    return (
                                        <button
                                            key={dayIdx}
                                            onClick={() => handleSlotSelect(day, time)}
                                            disabled={isPast || isBooked || isBlocked || selectedByOther || (loadingWeek && !hasData)}
                                            className={cn(
                                                "h-8 border-r last:border-r-0 transition-all touch-manipulation flex items-center justify-center text-sm",
                                                // 土日の背景色
                                                isSaturday && !isSelected && !selectedByOther && "bg-blue-50/50",
                                                isSunday && !isSelected && !selectedByOther && "bg-pink-50/50",
                                                // 選択中
                                                isSelected && "bg-primary text-primary-foreground",
                                                // 他の希望で選択済み
                                                selectedByOther && "bg-accent/50",
                                                // 過去
                                                isPast && "bg-muted/30 cursor-not-allowed"
                                            )}
                                        >
                                            {/* ローディング中はスケルトン表示 */}
                                            {loadingWeek && !hasData && !isPast && (
                                                <div className="w-3 h-3 rounded-full bg-muted-foreground/20 animate-pulse" />
                                            )}
                                            {isSelected && (
                                                <Icon name="check" size={14} />
                                            )}
                                            {/* 他の希望で選択済みの場合、希望番号を表示 */}
                                            {otherPreferenceIndex !== -1 && (
                                                <span className="text-[10px] font-bold text-primary">
                                                    {otherPreferenceIndex + 1}
                                                </span>
                                            )}
                                            {hasData && (isBooked || isBlocked) && !isPast && !isSelected && !selectedByOther && (
                                                <span className="text-[10px] text-muted-foreground">×</span>
                                            )}
                                            {hasData && available && !isPast && !isSelected && (
                                                <span className="text-green-600 font-bold">○</span>
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
                        <span className="text-green-600 font-bold">○</span>
                        <span>空き</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border rounded bg-primary" />
                        <span>選択中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border rounded bg-accent/50 flex items-center justify-center text-[8px] font-bold text-primary">1</div>
                        <span>他の希望</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">×</span>
                        <span>予約済</span>
                    </div>
                </div>

                {(loadingDay || loadingWeek) && (
                    <p className="text-xs text-center text-muted-foreground mt-1">読み込み中...</p>
                )}
            </section>

            {/* Parking Selection */}
            {hasFirstPreference && (
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
