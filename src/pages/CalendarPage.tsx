import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { motion } from "framer-motion";
import { CalendarDays, Plus, Clock, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Booking } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { NewBookingModal } from "@/components/NewBookingModal";
import { WeeklyCalendarView } from "@/components/admin/WeeklyCalendarView";
import { useAvailability } from "@/hooks/useAvailability";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export default function CalendarPage() {
    const { organizationId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
    const [initialBookingDate, setInitialBookingDate] = useState<Date | undefined>();
    const [initialBookingTime, setInitialBookingTime] = useState<string | undefined>();
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
    const [statusFilter, setStatusFilter] = useState<BookingStatus[]>(['pending', 'confirmed']);

    const { weekTimeSlots, fetchWeekAvailability, clearWeekCache } = useAvailability(organizationId);

    const filteredBookings = useMemo(() => {
        if (statusFilter.length === 0) return bookings;
        return bookings.filter(b => statusFilter.includes(b.status as BookingStatus));
    }, [bookings, statusFilter]);

    const toggleStatusFilter = (status: BookingStatus) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    // Calculate stats
    const stats = useMemo(() => {
        const pending = bookings.filter(b => b.status === 'pending').length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const todayCount = bookings.filter(b => isSameDay(new Date(b.selectedDate), new Date())).length;
        return { pending, confirmed, todayCount };
    }, [bookings]);

    useEffect(() => {
        const bookingId = searchParams.get("bookingId");
        if (bookingId && bookings.length > 0) {
            const targetBooking = bookings.find(b => b.id === bookingId);
            if (targetBooking) {
                setSelectedBooking(targetBooking);
                setIsModalOpen(true);
                setSearchParams({}, { replace: true });
            }
        }
    }, [bookings, searchParams, setSearchParams]);

    useEffect(() => {
        localStorage.setItem("calendar-view-mode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        fetchBookings();
        if (viewMode === "week" && organizationId) {
            fetchWeekAvailability(weekStart);
        }
    }, [currentDate, weekStart, viewMode, organizationId]);

    const handleBlockChange = useCallback(() => {
        if (organizationId) {
            fetchWeekAvailability(weekStart, false, true);
        }
    }, [fetchWeekAvailability, weekStart, organizationId]);

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
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            <AdminHeader />
            <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            予約管理
                        </h1>
                        <p className="text-muted-foreground text-sm mt-0.5">
                            予約の確認・承認・管理
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setInitialBookingDate(undefined);
                            setNewBookingModalOpen(true);
                        }}
                        size="sm"
                        className="btn-primary shadow-subtle"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        新規予約
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-none shadow-subtle">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-warning/10">
                                        <AlertCircle className="h-4 w-4 text-warning" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">承認待ち</p>
                                        <p className="text-lg font-bold text-warning">{stats.pending}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-none shadow-subtle">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-success/10">
                                        <Icon name="check_circle" size={16} className="text-success" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">確定済み</p>
                                        <p className="text-lg font-bold text-success">{stats.confirmed}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-none shadow-subtle">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-primary/10">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">今日の予約</p>
                                        <p className="text-lg font-bold">{stats.todayCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Filters and View Toggle */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">表示:</span>
                        <div className="flex gap-1">
                            <Button
                                variant={statusFilter.includes('pending') ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleStatusFilter('pending')}
                                className={`h-7 px-2.5 text-xs ${statusFilter.includes('pending') ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                                承認待ち
                            </Button>
                            <Button
                                variant={statusFilter.includes('confirmed') ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleStatusFilter('confirmed')}
                                className={`h-7 px-2.5 text-xs ${statusFilter.includes('confirmed') ? 'bg-success text-success-foreground hover:bg-success/90' : ''}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                                確定
                            </Button>
                            <Button
                                variant={statusFilter.includes('cancelled') ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleStatusFilter('cancelled')}
                                className="h-7 px-2.5 text-xs"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>

                    {/* View Toggle & Navigation */}
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex rounded-lg border bg-muted p-0.5">
                            <Button
                                variant={viewMode === "week" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("week")}
                                className="h-7 px-3 text-xs"
                            >
                                週
                            </Button>
                            <Button
                                variant={viewMode === "month" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("month")}
                                className="h-7 px-3 text-xs"
                            >
                                月
                            </Button>
                        </div>

                        {/* Month Navigation */}
                        {viewMode === "month" && (
                            <div className="flex items-center gap-1 bg-card rounded-lg border px-1">
                                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                                    <Icon name="chevron_left" size={16} />
                                </Button>
                                <span className="text-sm font-medium min-w-[100px] text-center tabular-nums">
                                    {format(currentDate, "yyyy年 M月", { locale: ja })}
                                </span>
                                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                                    <Icon name="chevron_right" size={16} />
                                </Button>
                                <div className="w-px h-4 bg-border" />
                                <Button variant="ghost" onClick={goToToday} className="h-7 px-2 text-xs">
                                    今日
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Today's Bookings (Show when pending exists) */}
                {stats.pending > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="mb-4 shadow-subtle border-none border-l-4 border-l-warning">
                            <CardHeader className="pb-2 pt-3 px-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-warning" />
                                    承認待ちの予約
                                    <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                                        {stats.pending}件
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 px-4 pb-3">
                                <div className="space-y-1.5">
                                    {bookings
                                        .filter(b => b.status === 'pending')
                                        .slice(0, 3)
                                        .map((booking) => (
                                            <button
                                                key={booking.id}
                                                onClick={() => handleBookingClick(booking)}
                                                className="w-full text-left p-2.5 rounded-lg border bg-warning/5 border-warning/20 hover:bg-warning/10 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-warning tabular-nums text-sm">
                                                            {format(new Date(booking.selectedDate), 'M/d')} {booking.selectedTime}
                                                        </span>
                                                        <span className="font-medium text-sm">{booking.customerName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold">¥{booking.totalPrice.toLocaleString()}</span>
                                                        <Icon name="chevron_right" size={16} className="text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    {stats.pending > 3 && (
                                        <p className="text-xs text-muted-foreground text-center pt-1">
                                            + 他 {stats.pending - 3}件
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Calendar View */}
                {viewMode === "week" ? (
                    <WeeklyCalendarView
                        weekStart={weekStart}
                        bookings={filteredBookings}
                        onBookingClick={handleBookingClick}
                        onWeekChange={setWeekStart}
                        onDayClick={(day, time) => {
                            setInitialBookingDate(day);
                            setInitialBookingTime(time);
                            setNewBookingModalOpen(true);
                        }}
                        weekTimeSlots={weekTimeSlots}
                        onBlockChange={handleBlockChange}
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
