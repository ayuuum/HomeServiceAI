import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
                "flex items-center justify-center w-5 h-5 text-[9px] font-bold rounded-full",
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
        <div className="space-y-8 sm:space-y-10">
            {/* Date Selection */}
            <section>
                <div className="flex items-center gap-3 mb-5">
                    <Icon name="calendar_today" size={26} className="text-primary" />
                    <h3 className="text-2xl font-bold">希望日を選択</h3>
                    <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-sm px-3 py-1">
                        必須
                    </Badge>
                </div>

                <Card className="p-4 sm:p-5 flex flex-col items-center overflow-x-auto">
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
                        className="rounded-md"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center text-lg font-bold",
                            caption_label: "text-lg font-bold",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-11 w-11 bg-transparent p-0 opacity-50 hover:opacity-100 touch-manipulation",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-11 sm:w-12 font-medium text-sm",
                            row: "flex w-full mt-1",
                            cell: "h-16 w-11 sm:h-18 sm:w-12 text-center text-sm p-0 relative",
                            day: "h-16 w-11 sm:h-18 sm:w-12 p-0 font-medium aria-selected:opacity-100 touch-manipulation",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
                            day_today: "bg-accent text-accent-foreground rounded-lg",
                            day_outside: "text-muted-foreground/50",
                            day_disabled: "text-muted-foreground/30",
                            day_hidden: "invisible",
                        }}
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
                                    <div className="flex flex-col items-center justify-center w-full h-full gap-0.5">
                                        <span className="text-base font-medium leading-none">{date.getDate()}</span>
                                        <div className="h-5 flex items-center justify-center">
                                            {!isPast && <AvailabilityDot status={availability?.status} />}
                                        </div>
                                    </div>
                                );
                            },
                        }}
                    />
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground w-full">
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-bold text-white">○</span>
                            <span className="font-medium">空きあり</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white">△</span>
                            <span className="font-medium">残りわずか</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">×</span>
                            <span className="font-medium">満席</span>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Time Selection */}
            {selectedDate && (
                <section>
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-3 mb-5">
                        <Icon name="schedule" size={26} className="text-primary" />
                        <h3 className="text-2xl font-bold">ご希望の開始時間</h3>
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-sm px-3 py-1">
                            必須
                        </Badge>
                        {loadingDay && (
                            <span className="text-base text-muted-foreground">読み込み中...</span>
                        )}
                    </div>
                    <p className="text-base text-muted-foreground mb-5">
                        ※ 作業開始予定の時間をお選びください
                    </p>
                    
                    {/* 2-column grid for larger buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        {timeSlots.map((time) => {
                            const slotInfo = getSlotInfo(time);
                            const isBooked = slotInfo?.isBooked ?? false;
                            const isSelected = selectedTime === time;

                            return (
                                <Button
                                    key={time}
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => !isBooked && onTimeSelect(time)}
                                    disabled={isBooked}
                                    aria-label={isBooked ? `${time} - 予約済み` : `${time} - 選択可能`}
                                    className={cn(
                                        "w-full h-16 text-xl font-bold touch-manipulation relative transition-all",
                                        isSelected && "ring-2 ring-primary ring-offset-2 bg-green-600 hover:bg-green-700",
                                        isBooked && "opacity-40 cursor-not-allowed bg-muted"
                                    )}
                                >
                                    <span className={cn(isBooked && "line-through text-muted-foreground")}>{time}</span>
                                    {isBooked && (
                                        <span className="absolute top-1 right-2 text-xl text-destructive font-bold" aria-hidden="true">
                                            ×
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                    <p className="text-base text-muted-foreground mt-4">
                        ※ × マークの時間帯は既に予約が入っています
                    </p>
                </section>
            )}

            {/* Parking Selection */}
            {selectedDate && selectedTime && (
                <section>
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-3 mb-5">
                        <Icon name="local_parking" size={26} className="text-primary" />
                        <h3 className="text-2xl font-bold">駐車場の有無</h3>
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-sm px-3 py-1">
                            必須
                        </Badge>
                    </div>

                    <RadioGroup value={hasParking} onValueChange={onParkingChange} className="space-y-4">
                        <div className={cn(
                            "flex items-center space-x-4 p-6 rounded-xl border-2 border-dashed touch-manipulation transition-all",
                            hasParking === "yes" ? "border-green-600 bg-green-50" : "border-border hover:border-muted-foreground/50"
                        )}>
                            <RadioGroupItem value="yes" id="parking-yes" className="h-7 w-7" />
                            <Label htmlFor="parking-yes" className="cursor-pointer flex-1 text-lg font-semibold">
                                駐車場あり
                            </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-4 p-6 rounded-xl border-2 border-dashed touch-manipulation transition-all",
                            hasParking === "no" ? "border-green-600 bg-green-50" : "border-border hover:border-muted-foreground/50"
                        )}>
                            <RadioGroupItem value="no" id="parking-no" className="h-7 w-7" />
                            <Label htmlFor="parking-no" className="cursor-pointer flex-1 text-lg font-semibold">
                                駐車場なし
                            </Label>
                        </div>
                    </RadioGroup>
                </section>
            )}
        </div>
    );
};
