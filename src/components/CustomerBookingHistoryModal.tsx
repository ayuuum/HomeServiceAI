import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Booking } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { BookingDetailModal } from "./BookingDetailModal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, Eye, CheckCircle2, XCircle } from "lucide-react";

interface CustomerBookingHistoryModalProps {
  customerId: string | null;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerBookingHistoryModal = ({
  customerId,
  customerName,
  open,
  onOpenChange,
}: CustomerBookingHistoryModalProps) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["customer-bookings", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_services(*),
          booking_options(*)
        `)
        .eq("customer_id", customerId)
        .order("selected_date", { ascending: false })
        .order("selected_time", { ascending: false });

      if (bookingsError) throw bookingsError;

      return (bookingsData || []).map(mapDbBookingToBooking);
    },
    enabled: !!customerId && open,
  });

  const handleViewDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending") {
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
          <Clock className="h-3 w-3 mr-1" />
          承認待ち
        </Badge>
      );
    }
    if (status === "confirmed") {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          確定済み
        </Badge>
      );
    }
    if (status === "cancelled") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          <XCircle className="h-3 w-3 mr-1" />
          キャンセル
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">予約履歴</DialogTitle>
            <DialogDescription>
              {customerName} さんの予約履歴
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                予約履歴がありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>予約日時</TableHead>
                      <TableHead>サービス</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(booking.selectedDate), "yyyy/MM/dd(E)", { locale: ja })}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {booking.selectedTime}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{booking.serviceName}</p>
                            {booking.optionsSummary.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                +{booking.optionsSummary.length}オプション
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ¥{booking.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(booking)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BookingDetailModal
        booking={selectedBooking}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onApprove={(bookingId) => {
          console.log("Approve:", bookingId);
        }}
        onReject={(bookingId) => {
          console.log("Reject:", bookingId);
        }}
      />
    </>
  );
};
