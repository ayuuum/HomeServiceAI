import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Booking, Staff } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { AdminHeader } from "@/components/AdminHeader";

export default function StaffSchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const { selectedStoreId } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedStoreId]);

  const fetchData = async () => {
    await Promise.all([fetchBookings(), fetchStaffs()]);
  };

  const fetchBookings = async () => {
    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          booking_services(*, services(*)),
          booking_options(*)
        `)
        .eq("selected_date", format(selectedDate, "yyyy-MM-dd"));

      if (selectedStoreId) {
        query = query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedBookings = (data || []).map(mapDbBookingToBooking);
      setBookings(mappedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchStaffs = async () => {
    try {
      let query = supabase
        .from("staffs")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (selectedStoreId) {
        query = query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedStaffs: Staff[] = (data || []).map((staff) => ({
        id: staff.id,
        storeId: staff.store_id,
        name: staff.name,
        colorCode: staff.color_code || "#3b82f6",
        lineUserId: staff.line_user_id || undefined,
        isActive: staff.is_active || true,
      }));

      setStaffs(mappedStaffs);
    } catch (error) {
      console.error("Error fetching staffs:", error);
    }
  };

  const handleAssignStaff = async (bookingId: string, staffId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ staff_id: staffId })
        .eq("id", bookingId);

      if (error) throw error;

      await fetchBookings();
      toast({
        title: "スタッフを割り当てました",
        description: "予約にスタッフが正常に割り当てられました。",
      });
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast({
        title: "エラー",
        description: "スタッフの割り当てに失敗しました。",
        variant: "destructive",
      });
    }
  };

  const unassignedBookings = bookings.filter((b) => !b.staffId);
  const assignedBookings = bookings.filter((b) => b.staffId);

  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9:00-18:00

  const getMinutesFromTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getPositionAndWidth = (booking: Booking) => {
    const startMinutes = getMinutesFromTime(booking.selectedTime);
    const startHour = 9 * 60; // 9:00 AM in minutes
    const totalMinutes = 10 * 60; // 10 hours display
    const left = ((startMinutes - startHour) / totalMinutes) * 100;
    const width = 5; // Fixed width for visibility
    return { left: `${Math.max(0, left)}%`, width: `${width}%` };
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                スタッフ配置カレンダー
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedDate(new Date())}
                >
                  今日
                </Button>
                <div className="font-semibold min-w-[200px] text-center">
                  {format(selectedDate, "yyyy年MM月dd日(E)", { locale: ja })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Unassigned Bookings */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">未割り当て予約 ({unassignedBookings.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unassignedBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    未割り当ての予約はありません
                  </p>
                ) : (
                  unassignedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      draggable
                      onDragStart={() => setDraggedBookingId(booking.id)}
                      onDragEnd={() => setDraggedBookingId(null)}
                      className="p-3 border rounded-lg bg-card hover:bg-accent cursor-move transition-colors"
                    >
                      <div className="font-medium text-sm">{booking.customerName}</div>
                      <div className="text-xs text-muted-foreground">{booking.selectedTime}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {booking.serviceName}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Staff Timeline */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">スタッフタイムライン</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Time Header */}
                <div className="flex mb-4 pl-32">
                  {hours.map((hour) => (
                    <div key={hour} className="flex-1 text-center text-xs text-muted-foreground border-l">
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* Staff Rows */}
                {staffs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    スタッフが登録されていません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {staffs.map((staff) => {
                      const staffBookings = assignedBookings.filter(
                        (b) => b.staffId === staff.id
                      );

                      return (
                        <div
                          key={staff.id}
                          className="flex items-center"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (draggedBookingId) {
                              handleAssignStaff(draggedBookingId, staff.id);
                            }
                          }}
                        >
                          <div className="w-32 pr-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: staff.colorCode }}
                              />
                              <span className="text-sm font-medium">{staff.name}</span>
                            </div>
                          </div>
                          <div className="flex-1 relative h-12 border rounded bg-muted/30">
                            {staffBookings.map((booking) => {
                              const { left, width } = getPositionAndWidth(booking);
                              return (
                                <div
                                  key={booking.id}
                                  className="absolute top-1 h-10 rounded px-2 flex items-center text-xs text-white font-medium overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    left,
                                    width,
                                    backgroundColor: staff.colorCode,
                                  }}
                                  title={`${booking.customerName} - ${booking.selectedTime}`}
                                >
                                  <span className="truncate">{booking.customerName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
