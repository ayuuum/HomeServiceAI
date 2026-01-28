import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Booking, Customer } from "@/types/booking";
import { mapDbBookingToBooking } from "@/lib/bookingMapper";
import { BookingDetailModal } from "./BookingDetailModal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface CustomerDetailModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onChat: (customer: Customer) => void;
  onViewAllHistory: (customer: Customer) => void;
}

export const CustomerDetailModal = ({
  customer,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onChat,
  onViewAllHistory,
}: CustomerDetailModalProps) => {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  // Reset editing state when customer changes or modal closes
  useEffect(() => {
    if (!open || !customer) {
      setIsEditingNotes(false);
      setEditedNotes("");
    }
  }, [open, customer]);

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!customer?.id) throw new Error("Customer ID not found");
      
      const { error } = await supabase
        .from("customers")
        .update({ notes: notes || null })
        .eq("id", customer.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("メモを保存しました");
      setIsEditingNotes(false);
    },
    onError: (error) => {
      toast.error("メモの保存に失敗しました: " + error.message);
    },
  });

  const handleStartEditing = () => {
    setEditedNotes(customer?.notes || "");
    setIsEditingNotes(true);
  };

  const handleCancelEditing = () => {
    setIsEditingNotes(false);
    setEditedNotes("");
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(editedNotes);
  };
  const { data: recentBookings = [], isLoading } = useQuery({
    queryKey: ["customer-recent-bookings", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_services(*),
          booking_options(*)
        `)
        .eq("customer_id", customer.id)
        .order("selected_date", { ascending: false })
        .order("selected_time", { ascending: false })
        .limit(5);

      if (bookingsError) throw bookingsError;

      return (bookingsData || []).map(mapDbBookingToBooking);
    },
    enabled: !!customer?.id && open,
  });

  const getStatusBadge = (status: string) => {
    if (status === "pending") {
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-xs">
          承認待ち
        </Badge>
      );
    }
    if (status === "confirmed") {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
          確定
        </Badge>
      );
    }
    if (status === "cancelled") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
          キャンセル
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  if (!customer) return null;

  const hasAddress = customer.postalCode || customer.address || customer.addressBuilding;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">顧客詳細</DialogTitle>
          </DialogHeader>

          {/* Customer Header */}
          <div className="flex items-center gap-3 py-3">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {customer.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg sm:text-xl text-foreground truncate">
                {customer.name || "未登録"}
              </h3>
              {customer.lineUserId && (
                <Badge variant="outline" className="bg-[#06C755]/10 text-[#06C755] border-[#06C755]/30 text-xs mt-1">
                  <Icon name="chat" size={10} className="mr-1" />
                  LINE連携済み
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="mail" size={16} />
              <span className="text-sm font-medium">連絡先</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="phone" size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm">{customer.phone || "未登録"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="mail" size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{customer.email || "未登録"}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          {hasAddress && (
            <div className="space-y-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="location_on" size={16} />
                <span className="text-sm font-medium">住所</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                {customer.postalCode && (
                  <p className="text-sm text-muted-foreground">〒{customer.postalCode}</p>
                )}
                {customer.address && (
                  <p className="text-sm">{customer.address}</p>
                )}
                {customer.addressBuilding && (
                  <p className="text-sm text-muted-foreground">{customer.addressBuilding}</p>
                )}
              </div>
            </div>
          )}

          {/* Usage Stats */}
          <div className="space-y-3 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="bar_chart" size={16} />
              <span className="text-sm font-medium">利用状況</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{customer.bookingCount || 0}回</p>
                <p className="text-xs text-muted-foreground">利用回数</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">¥{(customer.totalSpend || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">利用総額</p>
              </div>
            </div>
          </div>

          {/* Notes/Memo */}
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="notes" size={16} />
                <span className="text-sm font-medium">メモ・備考</span>
              </div>
              {!isEditingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleStartEditing}
                >
                  <Icon name="edit" size={14} className="mr-1" />
                  編集
                </Button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="顧客に関する注意事項やメモを入力..."
                  className="min-h-[100px] resize-y text-sm"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {editedNotes.length}/2000
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={handleCancelEditing}
                      disabled={updateNotesMutation.isPending}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={handleSaveNotes}
                      disabled={updateNotesMutation.isPending}
                    >
                      {updateNotesMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-3">
                {customer.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">メモはありません</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Recent Bookings */}
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="history" size={16} />
                <span className="text-sm font-medium">予約履歴（直近5件）</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                読み込み中...
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm bg-muted/30 rounded-lg">
                予約履歴がありません
              </div>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setDetailModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {format(new Date(booking.selectedDate), "yyyy/MM/dd(E)", { locale: ja })}
                          </span>
                          <span className="text-muted-foreground">{booking.selectedTime}</span>
                        </div>
                        <p className="font-medium text-sm truncate mt-0.5">{booking.serviceName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-sm">¥{booking.totalPrice.toLocaleString()}</span>
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                  </div>
                ))}

                {(customer.bookingCount || 0) > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-primary hover:text-primary"
                    onClick={() => {
                      onViewAllHistory(customer);
                      onOpenChange(false);
                    }}
                  >
                    すべての履歴を見る（{customer.bookingCount}件）
                    <Icon name="chevron_right" size={16} className="ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              variant="outline"
              className={`flex-1 h-10 ${
                customer.lineUserId 
                  ? "text-[#06C755] border-[#06C755]/30 hover:bg-[#06C755]/10" 
                  : "text-muted-foreground/40"
              }`}
              onClick={() => {
                if (customer.lineUserId) {
                  onChat(customer);
                  onOpenChange(false);
                }
              }}
              disabled={!customer.lineUserId}
            >
              <Icon name="chat" size={16} className="mr-1.5" />
              LINEチャット
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => {
                onEdit(customer);
                onOpenChange(false);
              }}
            >
              <Icon name="edit" size={16} className="mr-1.5" />
              編集
            </Button>
            <Button
              variant="outline"
              className="h-10 w-10 sm:w-10 p-0 text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                onDelete(customer);
                onOpenChange(false);
              }}
            >
              <Icon name="delete" size={16} />
            </Button>
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
