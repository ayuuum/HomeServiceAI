import { useState, useEffect } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminHeader } from "@/components/AdminHeader";
import { MobileNav } from "@/components/MobileNav";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Booking } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { toast } from "sonner";

export default function CalendarPage() {
    const { selectedStoreId } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [currentDate, selectedStoreId]);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const start = startOfWeek(startOfMonth(currentDate));
            const end = endOfWeek(endOfMonth(currentDate));

            let query = supabase
                .from("bookings")
                .select(`
          *,
          booking_services (service_title, service_quantity, service_base_price),
          booking_options (option_title, option_price, option_quantity),
          stores (name),
          staffs (name)
        `)
                .gte("selected_date", format(start, "yyyy-MM-dd"))
                .lte("selected_date", format(end, "yyyy-MM-dd"));

            if (selectedStoreId) {
                query = query.eq("store_id", selectedStoreId);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                setBookings(data.map(mapDbBookingToBooking));
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast.error("予約の取得に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate)),
    });

    const getBookingsForDay = (date: Date) => {
        return bookings.filter((booking) =>
            isSameDay(new Date(booking.selectedDate), date)
        );
    };

    const handleBookingClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleApprove = async (bookingId: string) => {
        const { error } = await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", bookingId);

        if (!error) {
            toast.success("予約を承認しました");
            fetchBookings();
        } else {
            toast.error("予約の承認に失敗しました");
        }
    };

    const handleReject = async (bookingId: string) => {
        const { error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId);

        if (!error) {
            toast.error("予約を却下しました");
            fetchBookings();
        } else {
            toast.error("予約の却下に失敗しました");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader />
            <div className="container mx-auto p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <CalendarIcon className="h-8 w-8" />
                            予約カレンダー
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            月ごとの予約状況を確認できます
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-semibold min-w-[140px] text-center">
                            {format(currentDate, "yyyy年 M月", { locale: ja })}
                        </h2>
                        <Button variant="outline" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" onClick={goToToday} className="ml-2">
                            今日
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 border-b">
                            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                                <div
                                    key={day}
                                    className={`p-4 text-center font-medium ${index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {days.map((day, dayIdx) => {
                                const dayBookings = getBookingsForDay(day);
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, currentDate);

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`min-h-[120px] p-2 border-b border-r relative transition-colors hover:bg-muted/30 ${!isCurrentMonth ? "bg-muted/10 text-muted-foreground" : ""
                                            } ${isToday ? "bg-accent/5" : ""}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span
                                                className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground"
                                                    }`}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            {dayBookings.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {dayBookings.length}件
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {dayBookings.map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => handleBookingClick(booking)}
                                                    className={`w-full text-left text-xs p-1.5 rounded border transition-colors truncate ${booking.status === "confirmed"
                                                        ? "bg-success text-success-foreground border-success hover:bg-success/90"
                                                        : booking.status === "cancelled"
                                                            ? "bg-muted text-muted-foreground border-border hover:bg-muted/80 line-through opacity-70"
                                                            : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                                        }`}
                                                >
                                                    <div className="font-medium truncate">
                                                        {booking.selectedTime} {booking.customerName}
                                                    </div>
                                                    <div className="truncate opacity-80 text-[10px]">
                                                        {booking.serviceName}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <BookingDetailModal
                booking={selectedBooking}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onApprove={handleApprove}
                onReject={handleReject}
                onSuccess={fetchBookings}
            />
            <MobileNav />
        </div>
    );
}
