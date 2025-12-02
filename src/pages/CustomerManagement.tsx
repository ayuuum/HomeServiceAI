import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
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
import { LineMessageModal } from "@/components/LineMessageModal";
import { AdminHeader } from "@/components/AdminHeader";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, History, MessageCircle } from "lucide-react";
import type { Customer } from "@/types/booking";

export default function CustomerManagement() {
  const { selectedStoreId } = useStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingBookingHistory, setViewingBookingHistory] = useState<Customer | null>(null);
  const [sendingLineMessage, setSendingLineMessage] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", selectedStoreId],
    queryFn: async () => {
      const query = supabase
        .from("customers")
        .select("*, bookings(id, total_price)")
        .order("created_at", { ascending: false });

      if (selectedStoreId) {
        query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c) => {
        const bookings = c.bookings || [];
        const bookingCount = bookings.length;
        const totalSpend = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

        return {
          id: c.id,
          storeId: c.store_id,
          lineUserId: c.line_user_id || undefined,
          name: c.name || "",
          phone: c.phone || undefined,
          email: c.email || undefined,
          address: c.address || undefined,
          bookingCount,
          totalSpend,
        };
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
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
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
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

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">顧客管理</h1>
          <p className="text-muted-foreground">顧客情報を一覧で管理できます</p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="名前または電話番号で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              新規顧客登録
            </Button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? "検索結果がありません" : "顧客データがありません"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead className="text-right">利用回数</TableHead>
                    <TableHead className="text-right">利用総額</TableHead>
                    <TableHead className="text-right">アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name || "-"}
                      </TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        {customer.bookingCount}回
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{customer.totalSpend?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {customer.lineUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSendingLineMessage(customer)}
                              title="LINEメッセージを送る"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingBookingHistory(customer)}
                            title="予約履歴を見る"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCustomer(customer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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

      <LineMessageModal
        open={!!sendingLineMessage}
        onOpenChange={(open) => !open && setSendingLineMessage(null)}
        customer={sendingLineMessage}
        storeId={selectedStoreId}
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
    </div>
  );
}
