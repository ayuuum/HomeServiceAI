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
    addDays,
    getDay,
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
import { NewBookingModal } from "@/components/NewBookingModal";
import { WeeklyCalendarView } from "@/components/admin/WeeklyCalendarView";
import { toast } from "sonner";

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
    const [initialBookingDate, setInitialBookingDate] = useState<Date | undefined>();
    const [viewMode, setViewMode] = useState<"month" | "week">(() => {
        const saved = localStorage.getItem("calendar-view-mode");
        return (saved === "week" || saved === "month") ? saved : "week";
    });
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        const dayOfWeek = getDay(today);
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        return addDays(today, mondayOffset);
    });

    useEffect(() => {
        localStorage.setItem("calendar-view-mode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        fetchBookings();
    }, [currentDate, weekStart, viewMode]);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            let start: Date, end: Date;
            
            if (viewMode === "week") {
                start = weekStart;
                end = addDays(weekStart, 6);
            } else {
                start = startOfWeek(startOfMonth(currentDate));
                end = endOfWeek(endOfMonth(currentDate));
            }

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
            <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
            <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-foreground">予約管理</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                予約の確認・承認・管理ができます
                            </p>
                        </div>
                        <Button 
                            onClick={() => {
                                setInitialBookingDate(undefined);
                                setNewBookingModalOpen(true);
                            }}
                            size="sm"
                            className="shrink-0 h-8 md:h-9 text-xs md:text-sm px-2.5 md:px-3"
                        >
                            <Icon name="add" size={16} className="md:mr-1" />
                            <span className="hidden md:inline">新規予約</span>
                            <span className="md:hidden">予約</span>
                        </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto md:self-end">
                        {/* ビュー切り替え */}
                        <div className="flex rounded-lg border bg-muted p-0.5 self-center sm:self-auto">
                            <Button 
                                variant={viewMode === "month" ? "default" : "ghost"} 
                                size="sm"
                                onClick={() => setViewMode("month")}
                                className="h-7 px-3 text-xs"
                            >
                                月
                            </Button>
                            <Button 
                                variant={viewMode === "week" ? "default" : "ghost"} 
                                size="sm"
                                onClick={() => setViewMode("week")}
                                className="h-7 px-3 text-xs"
                            >
                                週
                            </Button>
                        </div>
                        
                        {/* 月間ナビゲーション（月間ビューのみ） */}
                        {viewMode === "month" && (
                            <div className="flex items-center justify-center gap-2 bg-card p-1 rounded-lg shadow-subtle border border-border">
                                <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-muted h-8 w-8 md:h-9 md:w-9">
                                    <Icon name="chevron_left" size={18} />
                                </Button>
                                <h2 className="text-base md:text-xl font-bold min-w-[140px] md:min-w-[160px] text-center tabular-nums">
                                    {format(currentDate, "yyyy年 M月", { locale: ja })}
                                </h2>
                                <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-muted h-8 w-8 md:h-9 md:w-9">
                                    <Icon name="chevron_right" size={18} />
                                </Button>
                                <div className="w-px h-5 bg-border mx-0.5" />
                                <Button variant="ghost" onClick={goToToday} className="text-xs md:text-sm font-medium hover:bg-muted px-2 md:px-3 h-8 md:h-9">
                                    今日
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 今日の予約リスト */}
                <Card className="mb-6 shadow-subtle border-none">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2 flex-wrap">
                                <Icon name="today" size={18} className="text-primary shrink-0" />
                                <span className="whitespace-nowrap">今日の予約</span>
                                <Badge variant="secondary" className="text-xs">
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
                                className="text-xs md:text-sm self-start md:self-auto"
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
                                        className={`w-full text-left p-3 md:p-4 rounded-lg border transition-all hover:shadow-md ${
                                            booking.status === "confirmed"
                                                ? "bg-success/5 border-success/20 hover:bg-success/10"
                                                : booking.status === "cancelled"
                                                    ? "bg-muted border-border opacity-60"
                                                    : "bg-warning/5 border-warning/20 hover:bg-warning/10"
                                        }`}
                                    >
                                        {/* Mobile Layout */}
                                        <div className="md:hidden">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-base font-bold tabular-nums ${
                                                        booking.status === "confirmed" ? "text-success" : 
                                                        booking.status === "pending" ? "text-warning" : "text-muted-foreground"
                                                    }`}>
                                                        {booking.selectedTime}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            booking.status === "confirmed" ? "default" :
                                                            booking.status === "pending" ? "secondary" : "outline"
                                                        }
                                                        className={`text-xs ${
                                                            booking.status === "confirmed" ? "bg-success text-success-foreground" :
                                                            booking.status === "pending" ? "bg-warning text-warning-foreground" : ""
                                                        }`}
                                                    >
                                                        {booking.status === "confirmed" ? "確定" :
                                                         booking.status === "pending" ? "承認待ち" : "キャンセル"}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-sm text-foreground">
                                                        ¥{booking.totalPrice.toLocaleString()}
                                                    </span>
                                                    <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground">{booking.customerName}</p>
                                                <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
                                            </div>
                                        </div>

                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex items-center justify-between gap-4">
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
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* カレンダービュー */}
                {viewMode === "week" ? (
                    <WeeklyCalendarView
                        weekStart={weekStart}
                        bookings={bookings}
                        onBookingClick={handleBookingClick}
                        onWeekChange={setWeekStart}
                        onDayClick={(day, time) => {
                            setInitialBookingDate(day);
                            setNewBookingModalOpen(true);
                        }}
                    />
                ) : (
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
                                    const isTodayDate = isSameDay(day, new Date());
                                    const isCurrentMonth = isSameMonth(day, currentDate);

                                    return (
                                        <div
                                            key={day.toString()}
                                            onClick={(e) => {
                                                // Only trigger if clicking on the cell itself, not on a booking
                                                if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-day-cell]')) {
                                                    setInitialBookingDate(day);
                                                    setNewBookingModalOpen(true);
                                                }
                                            }}
                                            data-day-cell
                                            className={`min-h-[80px] md:min-h-[100px] p-1 md:p-1.5 bg-card relative transition-colors hover:bg-muted/5 cursor-pointer ${!isCurrentMonth ? "bg-muted/5 text-muted-foreground" : ""
                                                } ${isTodayDate ? "ring-2 ring-inset ring-primary/50 bg-primary/5" : ""}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span
                                                    className={`text-xs md:text-sm font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${isTodayDate
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-foreground/80"
                                                        }`}
                                                >
                                                    {format(day, "d")}
                                                </span>
                                                {dayBookings.length > 0 && (
                                                    <Badge variant="secondary" className="hidden md:inline-flex text-[10px] h-4 px-1 bg-muted text-muted-foreground font-normal">
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
                                                            <span className={`font-bold text-[10px] md:text-xs tabular-nums ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                                                                {booking.selectedTime}
                                                            </span>
                                                            <span className={`hidden md:inline font-medium text-xs truncate ${booking.status === "confirmed" ? "text-success" : booking.status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
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
                )}
            </div>

            <BookingDetailModal
                booking={selectedBooking}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onApprove={handleApprove}
                onReject={handleReject}
                onSuccess={fetchBookings}
            />

            <NewBookingModal
                open={newBookingModalOpen}
                onOpenChange={setNewBookingModalOpen}
                onBookingCreated={fetchBookings}
                initialDate={initialBookingDate}
            />
        </div>
    );
}
