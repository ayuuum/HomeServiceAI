import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Calendar, User, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { NewBookingModal } from "@/components/NewBookingModal";
import { Booking } from "@/types/booking";
import { toast } from "sonner";
import AdminServiceManagement from "./AdminServiceManagement";
import { supabase } from "@/integrations/supabase/client";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { AdminHeader } from "@/components/AdminHeader";
import { useStore } from "@/contexts/StoreContext";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-medium">
          <Clock className="h-3 w-3 mr-1" />
          承認待ち
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          確定済み
        </Badge>
      );
    default:
      return null;
  }
};

const AdminDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useStore();
  const navigate = useNavigate();

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
  }, [selectedStoreId]);



  const fetchBookings = async () => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity),
        stores (name),
        staffs (name)
      `)
      .order('created_at', { ascending: false });

    if (selectedStoreId) {
      query = query.eq('store_id', selectedStoreId);
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
      <section className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
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

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 sm:mb-8">
            <TabsTrigger value="bookings">予約管理</TabsTrigger>
            <TabsTrigger value="services">サービス管理</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-8">
            {/* Stats Cards */}
            {/* Stats Cards */}
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-subtle border-none">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      今月の売上
                    </p>
                    <p className="text-4xl font-bold text-primary tracking-tight tabular-nums">
                      ¥{totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      前月比 <span className="text-success font-medium">+12%</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-subtle border-none">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      承認待ちの予約
                    </p>
                    <p className="text-4xl font-bold text-warning tracking-tight tabular-nums">
                      {pendingCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      要対応の予約
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-subtle border-none">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      確定済みの予約
                    </p>
                    <p className="text-4xl font-bold text-success tracking-tight tabular-nums">
                      {confirmedCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      確定済みの予約数
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Bookings */}
            <Card className="shadow-subtle border-none">
              <CardHeader className="border-b border-border/50 bg-muted/30 py-4">
                <CardTitle className="text-lg font-semibold text-foreground">最近の予約</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">予約はありません。</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="font-bold text-base text-foreground truncate">
                              {booking.customerName}
                            </span>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(booking.selectedDate).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {booking.selectedTime}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {booking.staffName || "担当者未定"}
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
                            onClick={() => handleViewDetails(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
    </div>
  );
};

export default AdminDashboard;
