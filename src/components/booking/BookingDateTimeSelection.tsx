import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { ja } from "date-fns/locale";

interface BookingDateTimeSelectionProps {
    selectedDate: Date | undefined;
    onDateSelect: (date: Date | undefined) => void;
    selectedTime: string | undefined;
    onTimeSelect: (time: string) => void;
    hasParking: string;
    onParkingChange: (value: string) => void;
}

const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

export const BookingDateTimeSelection = ({
    selectedDate,
    onDateSelect,
    selectedTime,
    onTimeSelect,
    hasParking,
    onParkingChange,
}: BookingDateTimeSelectionProps) => {
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
                        <Card className="p-2 sm:p-4 flex justify-center overflow-x-auto">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={onDateSelect}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                locale={ja}
                                className="rounded-md scale-90 sm:scale-100 origin-center"
                            />
                        </Card>
                    </div>

                    {selectedDate && (
                        <div>
                            <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">
                                希望時間帯
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map((time) => (
                                    <Button
                                        key={time}
                                        variant={selectedTime === time ? "default" : "outline"}
                                        onClick={() => onTimeSelect(time)}
                                        className="w-full h-11 sm:h-10 text-sm sm:text-base touch-manipulation"
                                    >
                                        {time}
                                    </Button>
                                ))}
                            </div>
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
