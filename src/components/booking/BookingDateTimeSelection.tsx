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
        <div className="space-y-12">
            {/* Section 4: Date & Time Selection */}
            <section>
                <Separator className="mb-6" />
                <div className="flex items-center gap-2 mb-4">
                    <Icon name="calendar_today" size={20} className="text-primary" />
                    <h3 className="text-xl font-semibold">日時を選択</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <Label className="text-base font-semibold mb-3 block">希望日</Label>
                        <Card className="p-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={onDateSelect}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                locale={ja}
                                className="rounded-md"
                            />
                        </Card>
                    </div>

                    {selectedDate && (
                        <div>
                            <Label className="text-base font-semibold mb-3 block">
                                希望時間帯
                            </Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {timeSlots.map((time) => (
                                    <Button
                                        key={time}
                                        variant={selectedTime === time ? "default" : "outline"}
                                        onClick={() => onTimeSelect(time)}
                                        className="w-full"
                                    >
                                        <Icon name="schedule" size={16} className="mr-1" />
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
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-2 mb-4">
                        <Icon name="location_on" size={20} className="text-primary" />
                        <h3 className="text-xl font-semibold">現場情報</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold mb-3 block">
                                駐車場の有無 <span className="text-destructive">*</span>
                            </Label>
                            <RadioGroup value={hasParking} onValueChange={onParkingChange}>
                                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border">
                                    <RadioGroupItem value="yes" id="parking-yes" />
                                    <Label htmlFor="parking-yes" className="cursor-pointer flex-1">
                                        駐車場あり
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border">
                                    <RadioGroupItem value="no" id="parking-no" />
                                    <Label htmlFor="parking-no" className="cursor-pointer flex-1">
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
