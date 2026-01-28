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
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminHeader } from "@/components/AdminHeader";

import { supabase } from "@/integrations/supabase/client";
import { Booking } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { toast } from "sonner";

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [currentDate]);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const start = startOfWeek(startOfMonth(currentDate));
            const end = endOfWeek(endOfMonth(currentDate));

            const { data, error } = await supabase
                .from("bookings")
                .select(`
                    *,
                    booking_services (service_title, service_quantity, service_base_price),
                    booking_options (option_title, option_price, option_quantity)
                `)
                .gte("selected_date", format(start, "yyyy-MM-dd"))
                .lte("selected_date", format(end, "yyyy-MM-dd"));

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

    const getTodayBookings = () => {
        const today = new Date();
        return bookings
            .filter((booking) => isSameDay(new Date(booking.selectedDate), today))
            .sort((a, b) => a.selectedTime.localeCompare(b.selectedTime));
    };

    const todayBookings = getTodayBookings();

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
            <div className="container max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">予約管理</h1>
                        <p className="text-muted-foreground mt-1">
                            予約の確認・承認・管理ができます
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-card p-1 rounded-lg shadow-subtle border border-border">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-muted">
                            <Icon name="chevron_left" size={20} />
                        </Button>
                        <h2 className="text-xl font-bold min-w-[160px] text-center tabular-nums">
                            {format(currentDate, "yyyy年 M月", { locale: ja })}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-muted">
                            <Icon name="chevron_right" size={20} />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" onClick={goToToday} className="text-sm font-medium hover:bg-muted px-3">
                            今日
                        </Button>
                    </div>
                </div>

                {/* 今日の予約リスト */}
                <Card className="mb-6 shadow-subtle border-none">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Icon name="today" size={20} className="text-primary" />
                                今日の予約
                                <Badge variant="secondary" className="ml-2">
                                    {todayBookings.length}件
                                </Badge>
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    goToToday();
                                    document.getElementById('calendar-section')?.scrollIntoView({ 
                                        behavior: 'smooth' 
                                    });
                                }}
                                className="text-sm"
                            >
                                <Icon name="calendar_today" size={16} className="mr-1" />
                                カレンダーで見る
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Icon name="progress_activity" size={24} className="animate-spin text-muted-foreground" />
                            </div>
                        ) : todayBookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Icon name="event_available" size={48} className="mx-auto mb-2 opacity-50" />
                                <p>今日の予約はありません</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayBookings.map((booking) => (
                                    <button
                                        key={booking.id}
                                        onClick={() => handleBookingClick(booking)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md flex items-center justify-between gap-4 ${
                                            booking.status === "confirmed"
                                                ? "bg-success/5 border-success/20 hover:bg-success/10"
                                                : booking.status === "cancelled"
                                                    ? "bg-muted border-border opacity-60"
                                                    : "bg-warning/5 border-warning/20 hover:bg-warning/10"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`text-lg font-bold tabular-nums ${
                                                booking.status === "confirmed" ? "text-success" : 
                                                booking.status === "pending" ? "text-warning" : "text-muted-foreground"
                                            }`}>
                                                {booking.selectedTime}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">
                                                    {booking.customerName}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {booking.serviceName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-foreground">
                                                ¥{booking.totalPrice.toLocaleString()}
                                            </span>
                                            <Badge
                                                variant={
                                                    booking.status === "confirmed" ? "default" :
                                                    booking.status === "pending" ? "secondary" : "outline"
                                                }
                                                className={
                                                    booking.status === "confirmed" ? "bg-success text-success-foreground" :
                                                    booking.status === "pending" ? "bg-warning text-warning-foreground" : ""
                                                }
                                            >
                                                {booking.status === "confirmed" ? "確定" :
                                                 booking.status === "pending" ? "承認待ち" : "キャンセル"}
                                            </Badge>
                                            <Icon name="chevron_right" size={20} className="text-muted-foreground" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card id="calendar-section" className="shadow-medium border-none overflow-hidden">
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
                            {days.map((day) => {
                                const dayBookings = getBookingsForDay(day);
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, currentDate);

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`min-h-[100px] p-1.5 bg-card relative transition-colors hover:bg-muted/5 ${!isCurrentMonth ? "bg-muted/5 text-muted-foreground" : ""
                                            } ${isToday ? "ring-2 ring-inset ring-primary/50 bg-primary/5" : ""}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span
                                                className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-foreground/80"
                                                    }`}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            {dayBookings.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-muted text-muted-foreground font-normal">
                                                    {dayBookings.length}件
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-0.5">
                                            {dayBookings.slice(0, 2).map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => handleBookingClick(booking)}
                                                    className={`w-full text-left px-1.5 py-1 rounded border transition-all hover:shadow-sm ${booking.status === "confirmed"
                                                        ? "bg-success/10 border-success/20 hover:bg-success/20"
                                                        : booking.status === "cancelled"
                                                            ? "bg-muted border-border opacity-60"
                                                            : "bg-warning/10 border-warning/20 hover:bg-warning/20"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <span className={`font-bold text-xs tabular-nums ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                                                            {booking.selectedTime}
                                                        </span>
                                                        <span className={`font-medium text-xs truncate ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                                                            {booking.customerName}
                                                        </span>
                                                        {booking.status === "pending" && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            {dayBookings.length > 2 && (
                                                <button
                                                    onClick={() => {
                                                        // Click first hidden booking to open modal
                                                        handleBookingClick(dayBookings[2]);
                                                    }}
                                                    className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-0.5"
                                                >
                                                    +{dayBookings.length - 2}件
                                                </button>
                                            )}
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
        </div>
    );
}
