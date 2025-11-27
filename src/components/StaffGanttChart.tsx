import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Booking, Staff } from "@/types/booking";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";

interface StaffGanttChartProps {
  bookings: Booking[];
  staffs: Staff[];
  onBookingClick: (booking: Booking) => void;
}

const StaffGanttChart = ({ bookings, staffs, onBookingClick }: StaffGanttChartProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 時間軸の設定（9:00-18:00）
  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9-18時
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // 選択日の予約のみフィルタ
  const dayBookings = bookings.filter((b) => b.selectedDate === selectedDateStr);

  // 予約時間を分に変換
  const getMinutesFromTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 横軸の位置を計算（9:00を0%、18:00を100%とする）
  const getPositionAndWidth = (booking: Booking) => {
    const startMinutes = getMinutesFromTime(booking.selectedTime);
    const startOffset = (startMinutes - 9 * 60) / (9 * 60); // 9:00からの相対位置
    const duration = (booking.serviceQuantity || 1) * 60; // とりあえず1時間 × 数量
    const width = duration / (9 * 60); // 9時間に対する割合

    return {
      left: `${Math.max(0, Math.min(100, startOffset * 100))}%`,
      width: `${Math.max(5, Math.min(100, width * 100))}%`,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>スタッフスケジュール</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              今日
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(selectedDate, "M月d日(E)", { locale: ja })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* タイムライン（時間軸） */}
          <div className="flex border-b border-border pb-2">
            <div className="w-32 flex-shrink-0" />
            <div className="flex-1 flex relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {hour}:00
                </div>
              ))}
            </div>
          </div>

          {/* スタッフごとの行 */}
          {staffs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              スタッフが登録されていません
            </div>
          ) : (
            staffs.map((staff) => {
              const staffBookings = dayBookings.filter((b) => b.staffId === staff.id);

              return (
                <div key={staff.id} className="flex items-center min-h-[60px]">
                  {/* スタッフ名 */}
                  <div className="w-32 flex-shrink-0 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: staff.colorCode }}
                      />
                      <span className="text-sm font-medium">{staff.name}</span>
                    </div>
                  </div>

                  {/* タイムライン */}
                  <div className="flex-1 relative h-12 border border-border rounded bg-muted/20">
                    {/* 1時間ごとの縦線 */}
                    {hours.slice(1).map((hour, idx) => (
                      <div
                        key={hour}
                        className="absolute top-0 bottom-0 border-l border-border/50"
                        style={{ left: `${((idx + 1) / 9) * 100}%` }}
                      />
                    ))}

                    {/* 予約バー */}
                    {staffBookings.map((booking) => {
                      const { left, width } = getPositionAndWidth(booking);
                      return (
                        <button
                          key={booking.id}
                          className="absolute top-1 bottom-1 rounded px-2 text-xs text-white font-medium hover:opacity-80 transition-opacity cursor-pointer overflow-hidden"
                          style={{
                            left,
                            width,
                            backgroundColor: staff.colorCode,
                          }}
                          onClick={() => onBookingClick(booking)}
                        >
                          <div className="truncate">
                            {booking.customerName}
                          </div>
                          <div className="truncate text-[10px] opacity-90">
                            {booking.serviceName}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* 未割当予約 */}
          {dayBookings.filter((b) => !b.staffId).length > 0 && (
            <div className="flex items-center min-h-[60px] opacity-60">
              <div className="w-32 flex-shrink-0 pr-4">
                <span className="text-sm font-medium text-muted-foreground">
                  未割当
                </span>
              </div>
              <div className="flex-1 relative h-12 border border-dashed border-border rounded bg-muted/10">
                {dayBookings
                  .filter((b) => !b.staffId)
                  .map((booking) => {
                    const { left, width } = getPositionAndWidth(booking);
                    return (
                      <button
                        key={booking.id}
                        className="absolute top-1 bottom-1 bg-muted border border-border rounded px-2 text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer overflow-hidden"
                        style={{ left, width }}
                        onClick={() => onBookingClick(booking)}
                      >
                        <div className="truncate">{booking.customerName}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {booking.serviceName}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffGanttChart;
