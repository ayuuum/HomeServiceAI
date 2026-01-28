import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { NewBookingModal } from "@/components/NewBookingModal";
import { Booking } from "@/types/booking";
import { toast } from "sonner";
import AdminServiceManagement from "./AdminServiceManagement";
import { supabase } from "@/integrations/supabase/client";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { AdminHeader } from "@/components/AdminHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfDay, subDays, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { exportToCSV, formatDateForExport, formatCurrencyForExport, type ColumnConfig } from "@/lib/exportUtils";
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
    default:
      return null;
  }
};

const AdminDashboard = () => {
  const { organization } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
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
    fetchBookings();

    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, fetchBookings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, dateFilter]);

  const fetchBookings = async () => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq('status', statusFilter);
    }

    if (dateFilter !== "all") {
      const today = new Date();
      let startDate = new Date();

      if (dateFilter === "today") {
        startDate = startOfDay(today);
      } else if (dateFilter === "week") {
        startDate = startOfDay(subDays(today, 7));
      } else if (dateFilter === "month") {
        startDate = startOfDay(subDays(today, 30));
      }

      query = query.gte('selected_date', startDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (!error && data) {
      setBookings(data.map(mapDbBookingToBooking));
    }
    setLoading(false);
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
    } else {
      toast.error("予約の却下に失敗しました");
    }
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      {/* Tabs */}
      <section className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold">管理ダッシュボード</h1>
            <p className="text-sm text-muted-foreground mt-1">
              予約とサービスを一元管理
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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのステータス</SelectItem>
                <SelectItem value="pending">承認待ち</SelectItem>
                <SelectItem value="confirmed">確定済み</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="期間" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全期間</SelectItem>
                <SelectItem value="today">今日以降</SelectItem>
                <SelectItem value="week">1週間以内</SelectItem>
                <SelectItem value="month">1ヶ月以内</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 sm:mb-8">
            <TabsTrigger value="bookings">予約管理</TabsTrigger>
            <TabsTrigger value="services">サービス管理</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-8">
            {/* Booking Page URL Card */}
            {bookingPageUrl && (
              <motion.div variants={item} initial="hidden" animate="show">
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
            {/* Stats Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item} whileHover={{ y: -5 }}>
                <Card className="shadow-subtle border-none h-full">
                  <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                    <div className="flex flex-col">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">
                        今月の売上
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-primary tracking-tight tabular-nums">
                        ¥{totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 md:mt-2">
                        前月比 <span className="text-success font-medium">+12%</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item} whileHover={{ y: -5 }}>
                <Card className="shadow-subtle border-none h-full">
                  <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                    <div className="flex flex-col">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">
                        承認待ちの予約
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-warning tracking-tight tabular-nums">
                        {pendingCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 md:mt-2">
                        要対応の予約
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item} whileHover={{ y: -5 }}>
                <Card className="shadow-subtle border-none h-full">
                  <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                    <div className="flex flex-col">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">
                        確定済みの予約
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-success tracking-tight tabular-nums">
                        {confirmedCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 md:mt-2">
                        確定済みの予約数
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Recent Bookings */}
            <Card className="shadow-subtle border-none">
              <CardHeader className="border-b border-border/50 bg-muted/30 py-3 md:py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base md:text-lg font-semibold text-foreground">最近の予約</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs md:text-sm"
                  onClick={() => {
                    const columns: ColumnConfig[] = [
                      { key: 'id', header: '予約ID' },
                      { key: 'selectedDate', header: '予約日', formatter: formatDateForExport },
                      { key: 'selectedTime', header: '時間' },
                      { key: 'customerName', header: '顧客名' },
                      { key: 'customerPhone', header: '電話番号' },
                      { key: 'customerEmail', header: 'メールアドレス' },
                      { key: 'serviceName', header: 'サービス名' },
                      { key: 'totalPrice', header: '合計金額', formatter: formatCurrencyForExport },
                      { key: 'status', header: 'ステータス', formatter: (val) => 
                        val === 'pending' ? '承認待ち' : 
                        val === 'confirmed' ? '確定済み' : 
                        val === 'cancelled' ? 'キャンセル' : val 
                      },
                      { key: 'createdAt', header: '作成日', formatter: formatDateForExport },
                    ];
                    exportToCSV(bookings, columns, 'bookings');
                    toast.success('予約データをエクスポートしました');
                  }}
                  disabled={bookings.length === 0}
                >
                  <Icon name="download" size={14} className="mr-1" />
                  <span className="hidden sm:inline">CSV</span>エクスポート
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">予約はありません。</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="p-3 md:p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(booking)}
                      >
                        {/* Mobile Card Layout */}
                        <div className="md:hidden">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm text-foreground truncate">
                                  {booking.customerName}
                                </span>
                                {getStatusBadge(booking.status)}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {booking.serviceName}
                              </p>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className="text-base font-bold text-primary tabular-nums">
                                ¥{booking.totalPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="calendar_today" size={12} />
                              {new Date(booking.selectedDate).toLocaleDateString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="schedule" size={12} />
                              {booking.selectedTime}
                            </span>
                            {booking.customerPhone && (
                              <span className="flex items-center gap-1 truncate">
                                <Icon name="phone" size={12} />
                                {booking.customerPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop Row Layout */}
                        <div className="hidden md:flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="font-bold text-base text-foreground truncate">
                                {booking.customerName}
                              </span>
                              {getStatusBadge(booking.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Icon name="calendar_today" size={14} />
                                {new Date(booking.selectedDate).toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Icon name="schedule" size={14} />
                                {booking.selectedTime}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground tabular-nums">
                                ¥{booking.totalPrice.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">税込</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(booking);
                              }}
                            >
                              <Icon name="visibility" size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="services">
            <AdminServiceManagement />
          </TabsContent>
        </Tabs>
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
        onBookingCreated={fetchBookings}
      />

      {/* AI Assistant Widget */}
      <AdminAIAssistant />
    </div>
  );
};

export default AdminDashboard;
