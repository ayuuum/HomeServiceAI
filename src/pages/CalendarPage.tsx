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
                        <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                            <CalendarIcon className="h-8 w-8 text-primary" />
                            予約カレンダー
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            月ごとの予約状況を確認できます
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-card p-1 rounded-lg shadow-subtle border border-border">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-muted">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-xl font-bold min-w-[160px] text-center tabular-nums">
                            {format(currentDate, "yyyy年 M月", { locale: ja })}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-muted">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" onClick={goToToday} className="text-sm font-medium hover:bg-muted px-3">
                            今日
                        </Button>
                    </div>
                </div>

                <Card className="shadow-medium border-none overflow-hidden">
                    <CardContent className="p-0">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 border-b bg-muted/40">
                            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                                <div
                                    key={day}
                                    className={`py-3 text-center font-bold text-sm ${index === 0 ? "text-destructive" : index === 6 ? "text-primary" : "text-muted-foreground"
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr bg-border gap-px">
                            {days.map((day, dayIdx) => {
                                const dayBookings = getBookingsForDay(day);
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, currentDate);

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`min-h-[140px] p-2 bg-card relative transition-colors hover:bg-muted/5 ${!isCurrentMonth ? "bg-muted/5 text-muted-foreground" : ""
                                            } ${isToday ? "ring-2 ring-inset ring-primary/50 bg-primary/5" : ""}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span
                                                className={`text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-foreground/80"
                                                    }`}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            {dayBookings.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground font-normal">
                                                    {dayBookings.length}件
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            {dayBookings.map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => handleBookingClick(booking)}
                                                    className={`w-full text-left p-2 rounded-[6px] border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group ${booking.status === "confirmed"
                                                        ? "bg-success/10 text-success-foreground border-success/20 hover:bg-success/20"
                                                        : booking.status === "cancelled"
                                                            ? "bg-muted text-muted-foreground border-border opacity-60"
                                                            : "bg-warning/10 text-warning-foreground border-warning/20 hover:bg-warning/20"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <span className={`font-bold text-xs tabular-nums opacity-90 ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : ""}`}>
                                                            {booking.selectedTime}
                                                        </span>
                                                        {booking.status === "pending" && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                                                        )}
                                                    </div>
                                                    <div className={`font-bold text-xs truncate leading-tight mb-0.5 ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : ""}`}>
                                                        {booking.customerName}
                                                    </div>
                                                    <div className={`truncate text-[10px] opacity-80 leading-tight ${booking.status === "confirmed" ? "text-success/80" : booking.status === "pending" ? "text-warning/80" : ""}`}>
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
