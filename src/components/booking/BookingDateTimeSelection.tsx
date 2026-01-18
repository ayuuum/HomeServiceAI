import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DayAvailability, TimeSlotAvailability } from "@/hooks/useAvailability";

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
}

// 空き状況ドット+記号コンポーネント（色覚多様性対応）
const AvailabilityDot = ({ status }: { status?: DayAvailability["status"] }) => {
    if (!status) return null;

    const config = {
        available: { colorClass: "bg-green-500", symbol: "○" },
        partial: { colorClass: "bg-orange-500", symbol: "△" },
        full: { colorClass: "bg-red-500", symbol: "×" },
    }[status];

    return (
        <span
            className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center w-3 h-3 text-[6px] font-bold rounded-full",
                config.colorClass,
                "text-white"
            )}
            aria-label={status === "available" ? "空きあり" : status === "partial" ? "残りわずか" : "満席"}
        >
            {config.symbol}
        </span>
    );
};

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
}: BookingDateTimeSelectionProps) => {
    const getSlotInfo = (time: string): TimeSlotAvailability | undefined => {
        return dayTimeSlots.find((s) => s.time === time);
    };

    return (
        <div className="space-y-8 sm:space-y-12">
            {/* Section 4: Date & Time Selection */}
            <section>
                <Separator className="mb-4 sm:mb-6" />
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Icon name="calendar_today" size={18} className="text-primary sm:hidden" />
                    <Icon name="calendar_today" size={20} className="text-primary hidden sm:block" />
                    <h3 className="text-lg sm:text-xl font-semibold">日時を選択</h3>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <div>
                        <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">希望日</Label>
                        <Card className="p-2 sm:p-4 flex flex-col items-center overflow-x-auto">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={onDateSelect}
                                onMonthChange={onMonthChange}
                                disabled={(date) => {
                                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                                    const availability = getAvailabilityForDate(date);
                                    const isFull = availability?.status === "full";
                                    return isPast || isFull;
                                }}
                                locale={ja}
                                className="rounded-md scale-90 sm:scale-100 origin-center"
                                modifiers={{
                                    available: (date) => getAvailabilityForDate(date)?.status === "available",
                                    partial: (date) => getAvailabilityForDate(date)?.status === "partial",
                                    full: (date) => getAvailabilityForDate(date)?.status === "full",
                                }}
                                components={{
                                    DayContent: ({ date }) => {
                                        const availability = getAvailabilityForDate(date);
                                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                                        return (
                                            <div className="relative flex items-center justify-center w-full h-full">
                                                <span>{date.getDate()}</span>
                                                {!isPast && <AvailabilityDot status={availability?.status} />}
                                            </div>
                                        );
                                    },
                                }}
                            />
                            {/* 凡例（色覚多様性対応：色+記号） */}
                            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-border text-xs sm:text-sm text-muted-foreground w-full">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] font-bold text-white">○</span>
                                    <span>空きあり</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] font-bold text-white">△</span>
                                    <span>残りわずか</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">×</span>
                                    <span>満席</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {selectedDate && (
                        <div>
                            <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">
                                ご希望の開始時間
                                {loadingDay && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                                        読み込み中...
                                    </span>
                                )}
                            </Label>
                            <p className="text-xs text-muted-foreground mb-3">
                                ※ 作業開始予定の時間をお選びください
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map((time) => {
                                    const slotInfo = getSlotInfo(time);
                                    const isBooked = slotInfo?.isBooked ?? false;

                                    return (
                                        <Button
                                            key={time}
                                            variant={selectedTime === time ? "default" : "outline"}
                                            onClick={() => !isBooked && onTimeSelect(time)}
                                            disabled={isBooked}
                                            aria-label={isBooked ? `${time} - 予約済み` : `${time} - 選択可能`}
                                            className={cn(
                                                "w-full h-11 sm:h-10 text-sm sm:text-base touch-manipulation relative",
                                                isBooked && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span className={cn(isBooked && "line-through")}>{time}</span>
                                            {isBooked && (
                                                <span className="absolute top-0.5 right-1 text-sm text-destructive font-bold" aria-hidden="true">
                                                    ×
                                                </span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                ※ × マークの時間帯は既に予約が入っています
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Section 5: Diagnosis (Parking) */}
            {selectedDate && selectedTime && (
                <section>
                    <Separator className="mb-4 sm:mb-6" />
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Icon name="location_on" size={18} className="text-primary sm:hidden" />
                        <Icon name="location_on" size={20} className="text-primary hidden sm:block" />
                        <h3 className="text-lg sm:text-xl font-semibold">現場情報</h3>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        <div>
                            <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">
                                駐車場の有無 <span className="text-destructive">*</span>
                            </Label>
                            <RadioGroup value={hasParking} onValueChange={onParkingChange} className="space-y-2">
                                <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg border border-border active:bg-muted/50 touch-manipulation">
                                    <RadioGroupItem value="yes" id="parking-yes" className="h-5 w-5" />
                                    <Label htmlFor="parking-yes" className="cursor-pointer flex-1 text-sm sm:text-base">
                                        駐車場あり
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg border border-border active:bg-muted/50 touch-manipulation">
                                    <RadioGroupItem value="no" id="parking-no" className="h-5 w-5" />
                                    <Label htmlFor="parking-no" className="cursor-pointer flex-1 text-sm sm:text-base">
                                        駐車場なし
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
