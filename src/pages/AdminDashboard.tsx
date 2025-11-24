import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Calendar, User, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { Booking } from "@/types/booking";
import { toast } from "sonner";
import AdminServiceManagement from "./AdminServiceManagement";
import { supabase } from "@/integrations/supabase/client";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
          <Clock className="h-3 w-3 mr-1" />
          承認待ち
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
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
  const [loading, setLoading] = useState(true);

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
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity)
      `)
      .order('created_at', { ascending: false });

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
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">
            予約とサービスを一元管理
          </p>
        </div>
      </header>

      {/* Tabs */}
      <section className="container max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="bookings">予約管理</TabsTrigger>
            <TabsTrigger value="services">サービス管理</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-8">
            {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    承認待ち
                  </p>
                  <p className="text-3xl font-bold text-accent">{pendingCount}</p>
                </div>
                <Clock className="h-12 w-12 text-accent/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    確定済み
                  </p>
                  <p className="text-3xl font-bold text-success">{confirmedCount}</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-success/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    今月の売上
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    ¥{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <Calendar className="h-12 w-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <Card>
          <CardHeader>
            <CardTitle>予約リスト</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">読み込み中...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                予約がまだありません
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking, index) => (
                <div key={booking.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {booking.serviceName || "複数サービス"}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {booking.customerName}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          ¥{booking.totalPrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">税込</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.selectedDate}
                          </span>
                          <span className="text-muted-foreground">
                            {booking.selectedTime}〜
                          </span>
                        </div>
                        {booking.optionsSummary.length > 0 && (
                          <div className="ml-6">
                            <p className="text-muted-foreground mb-1">
                              オプション:
                            </p>
                            <ul className="space-y-1">
                              {booking.optionsSummary.map((option, idx) => (
                                <li key={idx} className="text-xs">
                                  • {option}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {booking.status === "pending" && (
                        <>
                          <Button 
                            size="sm" 
                            className="btn-primary"
                            onClick={() => handleApprove(booking.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            承認する
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleReject(booking.id)}
                          >
                            却下する
                          </Button>
                        </>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewDetails(booking)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        詳細を見る
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
    </div>
  );
};

export default AdminDashboard;
