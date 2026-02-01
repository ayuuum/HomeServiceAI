import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { NewBookingModal } from "@/components/NewBookingModal";
import { Booking } from "@/types/booking";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { AdminHeader } from "@/components/AdminHeader";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { AdminAIAssistant } from "@/components/AdminAIAssistant";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-medium">
          <Icon name="schedule" size={12} className="mr-1" />
          承認待ち
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-medium">
          <Icon name="check_circle" size={12} className="mr-1" />
          確定済み
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-medium">
          <Icon name="cancel" size={12} className="mr-1" />
          キャンセル
        </Badge>
      );
    default:
      return null;
  }
};

const AdminDashboard = () => {
  const { organization } = useAuth();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    bookingCount: 0,
    revenue: 0,
    newCustomers: 0,
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Build full booking page URL
  const bookingPageUrl = organization?.slug
    ? `${window.location.origin}/booking/${organization.slug}`
    : '';

  const copyBookingUrl = async () => {
    if (bookingPageUrl) {
      await navigator.clipboard.writeText(bookingPageUrl);
      toast.success("URLをコピーしました", {
        description: "お客様に共有してください",
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTodayBookings(),
      fetchPendingBookings(),
      fetchWeeklyStats(),
    ]);
    setLoading(false);
  };

  const fetchTodayBookings = async () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity)
      `)
      .eq('selected_date', todayStr)
      .neq('status', 'cancelled')
      .order('selected_time', { ascending: true });

    if (!error && data) {
      setTodayBookings(data.map(mapDbBookingToBooking));
    }
  };

  const fetchPendingBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setPendingBookings(data.map(mapDbBookingToBooking));
    }
  };

  const fetchWeeklyStats = async () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Get bookings for this week
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, total_price, status')
      .gte('selected_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('selected_date', format(weekEnd, 'yyyy-MM-dd'));

    if (!bookingsError && bookings) {
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      setWeeklyStats(prev => ({
        ...prev,
        bookingCount: bookings.filter(b => b.status !== 'cancelled').length,
        revenue: confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
      }));
    }

    // Get new customers this week
    const { count: newCustomersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    if (!customersError && newCustomersCount !== null) {
      setWeeklyStats(prev => ({
        ...prev,
        newCustomers: newCustomersCount,
      }));
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const handleApprove = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (!error) {
      toast.success("予約を承認しました", {
        description: "お客様に確認メールが送信されました",
      });
      fetchDashboardData();
    } else {
      toast.error("予約の承認に失敗しました");
    }
  };

  const handleReject = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (!error) {
      toast.error("予約を却下しました", {
        description: "お客様に通知メールが送信されました",
      });
      fetchDashboardData();
    } else {
      toast.error("予約の却下に失敗しました");
    }
  };

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <section className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold">ホーム</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(today, 'yyyy年M月d日（E）', { locale: ja })}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setNewBookingModalOpen(true)}
              className="flex-1 sm:flex-none"
            >
              ＋ 新規予約
            </Button>
          </div>
        </div>

        <motion.div
          className="space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* 今日の予約 */}
          <motion.div variants={item}>
            <Card className="shadow-subtle border-none">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Icon name="today" size={18} className="text-primary" />
                  今日の予約
                  {todayBookings.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{todayBookings.length}件</Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/calendar')}
                  className="text-muted-foreground hover:text-primary"
                >
                  カレンダーを開く
                  <Icon name="chevron_right" size={16} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
                ) : todayBookings.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="event_available" size={48} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">今日の予約はありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {todayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-muted/30 -mx-4 px-4 cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(booking)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-primary tabular-nums w-14">
                            {booking.selectedTime}
                          </span>
                          <div>
                            <p className="font-medium">{booking.customerName}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {booking.serviceName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(booking.status)}
                          {booking.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(booking.id);
                              }}
                            >
                              <Icon name="check_circle" size={14} className="mr-1" />
                              承認
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 要対応 */}
          {pendingBookings.length > 0 && (
            <motion.div variants={item}>
              <Card className="shadow-subtle border-none border-l-4 border-l-warning">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Icon name="notification_important" size={18} className="text-warning" />
                    要対応
                    <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30">
                      {pendingBookings.length}件
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/50">
                    {pendingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <Icon name="schedule" size={20} className="text-warning mt-0.5" />
                          <div>
                            <p className="font-medium">
                              新規予約: {booking.customerName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.selectedDate), 'M/d（E）', { locale: ja })} {booking.selectedTime} · {booking.serviceName}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-8 sm:ml-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(booking)}
                          >
                            詳細
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm"
                            onClick={() => handleApprove(booking.id)}
                          >
                            <Icon name="check_circle" size={14} className="mr-1" />
                            承認
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm"
                            onClick={() => handleReject(booking.id)}
                          >
                            <Icon name="cancel" size={14} className="mr-1" />
                            却下
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 今週のサマリー */}
          <motion.div variants={item}>
            <Card className="shadow-subtle border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Icon name="analytics" size={18} className="text-primary" />
                  今週のサマリー
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {format(weekStart, 'M/d', { locale: ja })} - {format(weekEnd, 'M/d', { locale: ja })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">予約数</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {weeklyStats.bookingCount}<span className="text-sm font-normal">件</span>
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">売上（確定分）</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">
                      ¥{weeklyStats.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">新規顧客</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {weeklyStats.newCustomers}<span className="text-sm font-normal">名</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 予約ページURL */}
          {bookingPageUrl && (
            <motion.div variants={item}>
              <Card className="shadow-subtle border-none bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Icon name="link" size={18} className="text-primary" />
                    あなたの予約ページURL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Input
                      value={bookingPageUrl}
                      readOnly
                      className="flex-1 bg-background text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={copyBookingUrl} variant="outline" className="flex-1 sm:flex-none">
                        <Icon name="content_copy" size={16} className="mr-2" />
                        コピー
                      </Button>
                      <Button asChild variant="default" className="flex-1 sm:flex-none">
                        <a href={bookingPageUrl} target="_blank" rel="noopener noreferrer">
                          <Icon name="open_in_new" size={16} className="mr-2" />
                          開く
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    このURLをお客様に共有して、オンラインで予約を受け付けましょう
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <NewBookingModal
        open={newBookingModalOpen}
        onOpenChange={setNewBookingModalOpen}
        onBookingCreated={fetchDashboardData}
      />

      {/* AI Assistant Widget */}
      <AdminAIAssistant />
    </div>
  );
};

export default AdminDashboard;
