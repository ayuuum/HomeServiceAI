import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { CustomerBookingHistoryModal } from "@/components/CustomerBookingHistoryModal";
import { LineChatModal } from "@/components/LineChatModal";
import { AdminHeader } from "@/components/AdminHeader";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import type { Customer } from "@/types/booking";
import { exportToCSV, formatDateForExport, formatCurrencyForExport, type ColumnConfig } from "@/lib/exportUtils";

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [viewingBookingHistory, setViewingBookingHistory] = useState<Customer | null>(null);
  const [chattingCustomer, setChattingCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, bookings(id, total_price, customer_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((c) => {
        const bookings = c.bookings || [];
        const bookingCount = bookings.length;
        const totalSpend = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        // 予約に紐づく名前も収集（検索用）
        const bookingNames = bookings.map((b) => b.customer_name).filter(Boolean);

        return {
          id: c.id,
          lineUserId: c.line_user_id || undefined,
          name: c.name || "",
          phone: c.phone || undefined,
          email: c.email || undefined,
          postalCode: c.postal_code || undefined,
          address: c.address || undefined,
          addressBuilding: c.address_building || undefined,
          bookingCount,
          totalSpend,
          bookingNames,
        };
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error("組織IDが見つかりません");
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("顧客を削除しました");
      setDeletingCustomer(null);
    },
    onError: (error) => {
      toast.error("削除に失敗しました: " + error.message);
    },
  });

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    // 予約の名前も検索対象に含める
    const matchesBookingName = customer.bookingNames?.some((name: string) =>
      name?.toLowerCase().includes(search)
    );
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      matchesBookingName
    );
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const [isFixing, setIsFixing] = useState(false);

  const fixMissingCustomers = async () => {
    if (!organizationId) {
      toast.error("組織IDが見つかりません");
      return;
    }

    try {
      setIsFixing(true);
      let fixedCount = 0;

      // 1. 顧客名を最新の予約名で同期（組織IDでフィルタリング）
      const { data: customersWithBookings } = await supabase
        .from('customers')
        .select('id, name, bookings(customer_name, created_at)')
        .eq('organization_id', organizationId);

      if (customersWithBookings) {
        for (const customer of customersWithBookings) {
          const bookings = customer.bookings || [];
          if (bookings.length === 0) continue;

          // 最新の予約を取得
          const latestBooking = bookings.sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0];

          // 名前が異なる場合は更新
          if (latestBooking?.customer_name && latestBooking.customer_name !== customer.name) {
            await supabase
              .from('customers')
              .update({ name: latestBooking.customer_name })
              .eq('id', customer.id)
              .eq('organization_id', organizationId);
            fixedCount++;
          }
        }
      }

      // 2. customer_id が null の予約を修正（組織IDでフィルタリング）
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('organization_id', organizationId)
        .is('customer_id', null);

      if (bookingsError) throw bookingsError;

      for (const booking of bookings || []) {
        let customerId = null;

        // Try to match by email or phone first if available
        // Try to match by email or phone first if available
        if (booking.customer_email || booking.customer_phone) {
          const conditions = [];
          if (booking.customer_email) conditions.push(`email.eq.${booking.customer_email}`);
          if (booking.customer_phone) {
            const normalizedPhone = booking.customer_phone.replace(/[^\d]/g, '');
            conditions.push(`phone.eq.${booking.customer_phone}`);
            if (normalizedPhone !== booking.customer_phone) {
              conditions.push(`phone.eq.${normalizedPhone}`);
            }
          }

          if (conditions.length > 0) {
            const { data: existing } = await supabase
              .from('customers')
              .select('id')
              .eq('organization_id', organizationId)
              .or(conditions.join(','))
              .maybeSingle();

            if (existing) customerId = existing.id;
          }
        }

        // If not found, try by name
        if (!customerId && booking.customer_name) {
          const { data: existingByName } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', booking.customer_name)
            .maybeSingle();

          if (existingByName) customerId = existingByName.id;
        }

        // If still not found, create new customer
        if (!customerId) {
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              name: booking.customer_name || '不明な顧客',
              email: booking.customer_email,
              phone: booking.customer_phone,
              // @ts-ignore
              organization_id: booking.organization_id
            })
            .select('id')
            .single();

          if (!createError && newCustomer) {
            customerId = newCustomer.id;
          }
        }

        // Update booking with customer_id
        if (customerId) {
          await supabase
            .from('bookings')
            .update({ customer_id: customerId })
            .eq('id', booking.id);
          fixedCount++;
        }
      }

      if (fixedCount === 0) {
        toast.info("修正が必要なデータはありませんでした");
      } else {
        toast.success(`${fixedCount}件のデータを修正しました`);
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      console.error("Fix error:", error);
      toast.error("データの修正に失敗しました");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold text-foreground">顧客管理</h1>
          <p className="text-sm text-muted-foreground mt-1">顧客情報を一覧で管理できます</p>
        </div>

        <div className="bg-card rounded-[10px] shadow-medium border-none">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Icon name="search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="名前または電話番号で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg shadow-subtle border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <Button onClick={handleAdd} className="w-full sm:w-auto btn-primary shadow-subtle h-12 px-6">
              <Icon name="add" size={20} className="mr-2" />
              新規顧客登録
            </Button>
            <Button onClick={fixMissingCustomers} variant="outline" className="w-full sm:w-auto h-12 px-6" disabled={isFixing}>
              <Icon name="sync" size={16} className={`mr-2 ${isFixing ? "animate-spin" : ""}`} />
              データ同期
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-6"
              onClick={() => {
                const columns: ColumnConfig[] = [
                  { key: 'name', header: '顧客名' },
                  { key: 'phone', header: '電話番号' },
                  { key: 'email', header: 'メールアドレス' },
                  { key: 'postalCode', header: '郵便番号' },
                  { key: 'address', header: '住所' },
                  { key: 'addressBuilding', header: '建物名' },
                  { key: 'bookingCount', header: '利用回数' },
                  { key: 'totalSpend', header: '利用総額', formatter: formatCurrencyForExport },
                ];
                exportToCSV(filteredCustomers, columns, 'customers');
                toast.success('顧客データをエクスポートしました');
              }}
              disabled={filteredCustomers.length === 0}
            >
              <Icon name="download" size={16} className="mr-2" />
              CSVエクスポート
            </Button>
          </div>

          {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? "検索結果がありません" : "顧客データがありません"}
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-border">
                  {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{customer.name || "-"}</p>
                          <p className="text-sm text-muted-foreground truncate">{customer.phone || "-"}</p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          )}
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="font-bold text-foreground tabular-nums">¥{customer.totalSpend?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{customer.bookingCount}回利用</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => setViewingBookingHistory(customer)}
                        >
                          <Icon name="history" size={14} className="mr-1" />
                          履歴
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => handleEdit(customer)}
                        >
                          <Icon name="edit" size={14} className="mr-1" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-9 w-9 p-0 ${
                            customer.lineUserId 
                              ? "text-[#06C755] border-[#06C755]/30 hover:bg-[#06C755]/10" 
                              : "text-muted-foreground/40"
                          }`}
                          onClick={() => customer.lineUserId && setChattingCustomer(customer)}
                          disabled={!customer.lineUserId}
                        >
                          <Icon name="chat" size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">名前</TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">電話番号</TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">メール</TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6 hidden lg:table-cell whitespace-nowrap">住所</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">利用回数</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">利用総額</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 w-[160px] whitespace-nowrap">アクション</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/20 border-b border-border/50 transition-colors h-16">
                          <TableCell className="font-bold text-foreground px-6 whitespace-nowrap">
                            {customer.name || "-"}
                          </TableCell>
                          <TableCell className="px-6 text-muted-foreground whitespace-nowrap">{customer.phone || "-"}</TableCell>
                          <TableCell className="px-6 text-muted-foreground whitespace-nowrap">{customer.email || "-"}</TableCell>
                          <TableCell className="px-6 text-muted-foreground hidden lg:table-cell max-w-[200px]" title={`${customer.address || ""}${customer.addressBuilding ? ` ${customer.addressBuilding}` : ""}`}>
                            <div className="truncate">
                              {customer.postalCode && `〒${customer.postalCode} `}
                              {customer.address || "-"}
                            </div>
                            {customer.addressBuilding && (
                              <div className="truncate text-xs">{customer.addressBuilding}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-6 font-medium whitespace-nowrap">
                            {customer.bookingCount}回
                          </TableCell>
                          <TableCell className="text-right px-6 whitespace-nowrap">
                            <span className="font-bold text-foreground tabular-nums text-lg">
                              ¥{customer.totalSpend?.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-9 w-9 p-0 rounded-full ${
                                  customer.lineUserId 
                                    ? "text-[#06C755] hover:text-[#06C755] hover:bg-[#06C755]/10" 
                                    : "text-muted-foreground/40 cursor-not-allowed"
                                }`}
                                onClick={() => customer.lineUserId && setChattingCustomer(customer)}
                                disabled={!customer.lineUserId}
                                title={customer.lineUserId ? "LINEチャット" : "LINE未連携"}
                              >
                                <Icon name="chat" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                onClick={() => setViewingBookingHistory(customer)}
                                title="予約履歴を見る"
                              >
                                <Icon name="history" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                onClick={() => handleEdit(customer)}
                              >
                                <Icon name="edit" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={() => setDeletingCustomer(customer)}
                              >
                                <Icon name="delete" size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
        </div>
      </div>

      <CustomerFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        customer={editingCustomer}
      />

      <CustomerBookingHistoryModal
        customerId={viewingBookingHistory?.id || null}
        customerName={viewingBookingHistory?.name || ""}
        open={!!viewingBookingHistory}
        onOpenChange={(open) => !open && setViewingBookingHistory(null)}
      />

      <AlertDialog
        open={!!deletingCustomer}
        onOpenChange={() => setDeletingCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>顧客を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCustomer?.name} を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LineChatModal
        open={!!chattingCustomer}
        onOpenChange={(open) => !open && setChattingCustomer(null)}
        customerId={chattingCustomer?.id || ''}
        lineUserId={chattingCustomer?.lineUserId}
        customerName={chattingCustomer?.name || ''}
      />
    </div>
  );
}
