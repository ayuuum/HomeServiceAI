import { useState } from "react";
import { Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/StickyFooter";
import { Calendar } from "@/components/ui/calendar";
import { ja } from "date-fns/locale";

interface CalendarStepProps {
  totalPrice: number;
  discount: number;
  discountRate: number;
  onNext: (date: Date, time: string) => void;
}

export const CalendarStep = ({ totalPrice, discount, discountRate, onNext }: CalendarStepProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const timeSlots = [
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: false },
    { time: "13:00", available: true },
    { time: "14:00", available: true },
    { time: "15:00", available: true },
    { time: "16:00", available: false },
  ];

  const handleNext = () => {
    if (!selectedDate || !selectedTime) return;
    onNext(selectedDate, selectedTime);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <section className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">希望日を選択</h3>
          </div>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ja}
              disabled={(date) => date < new Date()}
              className="rounded-lg border border-border bg-card p-3"
            />
          </div>
        </div>

        {selectedDate && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">希望時間を選択</h3>
            </div>
            
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>即予約可能</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>リクエスト</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map(({ time, available }) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  onClick={() => available && setSelectedTime(time)}
                  disabled={!available}
                  className="h-16 relative"
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">{time}</div>
                    <div className="text-xs">
                      {available ? (
                        <span className="text-success flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          即予約
                        </span>
                      ) : (
                        <span className="text-muted-foreground">満席</span>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedDate && selectedTime && (
        <StickyFooter
          totalPrice={totalPrice}
          discount={discount}
          discountRate={discountRate}
          onNext={handleNext}
          buttonText="問診へ進む"
        />
      )}
    </div>
  );
};
