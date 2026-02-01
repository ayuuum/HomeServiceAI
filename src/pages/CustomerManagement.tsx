import { useState, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { CustomerBookingHistoryModal } from "@/components/CustomerBookingHistoryModal";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { LineChatModal } from "@/components/LineChatModal";
import { AdminHeader } from "@/components/AdminHeader";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { motion } from "framer-motion";
import { Users, Repeat, Banknote, MessageSquare, Crown, MoreHorizontal } from "lucide-react";
import type { Customer } from "@/types/booking";
import { exportToCSV, formatCurrencyForExport, type ColumnConfig } from "@/lib/exportUtils";

type SegmentType = 'all' | 'repeater' | 'new' | 'vip' | 'dormant';

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [segment, setSegment] = useState<SegmentType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingBookingHistory, setViewingBookingHistory] = useState<Customer | null>(null);
  const [chattingCustomer, setChattingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, bookings(id, total_price, customer_name, created_at, status)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      return (data || []).map((c) => {
        const bookings = c.bookings || [];
        const bookingCount = bookings.length;
        const totalSpend = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const bookingNames = bookings.map((b) => b.customer_name).filter(Boolean);

        // Calculate first and last booking dates
        const bookingDates = bookings.map(b => new Date(b.created_at));
        const firstBooking = bookingDates.length > 0 ? new Date(Math.min(...bookingDates.map(d => d.getTime()))) : null;
        const lastBooking = bookingDates.length > 0 ? new Date(Math.max(...bookingDates.map(d => d.getTime()))) : null;

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
          notes: c.notes || undefined,
          firstBooking,
          lastBooking,
          isNew: firstBooking && firstBooking >= thirtyDaysAgo,
          isDormant: lastBooking && lastBooking < sixtyDaysAgo,
          isRepeater: bookingCount >= 2,
        };
      });
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = customers.length;
    const repeaters = customers.filter(c => c.bookingCount >= 2).length;
    const lineConnected = customers.filter(c => c.lineUserId).length;
    const totalLTV = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);

    // Calculate VIP threshold (top 10%)
    const sortedBySpend = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    const vipThreshold = sortedBySpend[Math.floor(sortedBySpend.length * 0.1)]?.totalSpend || 0;

    return {
      total,
      repeaterRate: total > 0 ? Math.round((repeaters / total) * 100) : 0,
      averageLTV: total > 0 ? Math.round(totalLTV / total) : 0,
      lineRate: total > 0 ? Math.round((lineConnected / total) * 100) : 0,
      vipThreshold,
    };
  }, [customers]);

  // Filter customers by segment
  const segmentedCustomers = useMemo(() => {
    return customers.map(c => ({
      ...c,
      isVip: c.totalSpend >= kpis.vipThreshold && kpis.vipThreshold > 0,
    }));
  }, [customers, kpis.vipThreshold]);

  const filteredCustomers = useMemo(() => {
    let filtered = segmentedCustomers;

    // Apply segment filter
    switch (segment) {
      case 'repeater':
        filtered = filtered.filter(c => c.isRepeater);
        break;
      case 'new':
        filtered = filtered.filter(c => c.isNew);
        break;
      case 'vip':
        filtered = filtered.filter(c => c.isVip);
        break;
      case 'dormant':
        filtered = filtered.filter(c => c.isDormant);
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((customer) => {
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
    }

    return filtered;
  }, [segmentedCustomers, segment, searchTerm]);

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

      const { data: customersWithBookings } = await supabase
        .from('customers')
        .select('id, name, bookings(customer_name, created_at)')
        .eq('organization_id', organizationId);

      if (customersWithBookings) {
        for (const customer of customersWithBookings) {
          const bookings = customer.bookings || [];
          if (bookings.length === 0) continue;

          const latestBooking = bookings.sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0];

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

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('organization_id', organizationId)
        .is('customer_id', null);

      if (bookingsError) throw bookingsError;

      for (const booking of bookings || []) {
        let customerId = null;

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

        if (!customerId && booking.customer_name) {
          const { data: existingByName } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', booking.customer_name)
            .maybeSingle();

          if (existingByName) customerId = existingByName.id;
        }

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

  const segments: { key: SegmentType; label: string; count: number }[] = [
    { key: 'all', label: '全顧客', count: customers.length },
    { key: 'repeater', label: 'リピーター', count: customers.filter(c => c.isRepeater).length },
    { key: 'new', label: '新規', count: customers.filter(c => c.isNew).length },
    { key: 'vip', label: 'VIP', count: segmentedCustomers.filter(c => c.isVip).length },
    { key: 'dormant', label: '休眠', count: customers.filter(c => c.isDormant).length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold text-foreground">顧客管理</h1>
          <p className="text-sm text-muted-foreground mt-1">顧客情報を一覧で管理できます</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { title: '総顧客数', value: kpis.total, format: (v: number) => `${v}人`, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
            { title: 'リピーター率', value: kpis.repeaterRate, format: (v: number) => `${v}%`, icon: Repeat, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
            { title: '平均LTV', value: kpis.averageLTV, format: (v: number) => `¥${v.toLocaleString()}`, icon: Banknote, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
            { title: 'LINE連携率', value: kpis.lineRate, format: (v: number) => `${v}%`, icon: MessageSquare, color: 'text-[#06C755]', bgColor: 'bg-[#06C755]/10' },
          ].map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-none shadow-medium">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.title}</p>
                      <p className="text-lg md:text-xl font-bold">{kpi.format(kpi.value)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-none shadow-medium">
            {/* Segment Tabs */}
            <div className="border-b overflow-x-auto">
              <div className="flex min-w-max">
                {segments.map((seg) => (
                  <button
                    key={seg.key}
                    onClick={() => setSegment(seg.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${segment === seg.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                      }`}
                  >
                    {seg.label}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {seg.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Actions */}
            <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="名前・電話番号・メールで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} className="btn-primary shadow-subtle">
                  <Icon name="add" size={18} className="mr-1.5" />
                  新規登録
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const columns: ColumnConfig[] = [
                      { key: 'name', header: '顧客名' },
                      { key: 'phone', header: '電話番号' },
                      { key: 'email', header: 'メールアドレス' },
                      { key: 'bookingCount', header: '利用回数' },
                      { key: 'totalSpend', header: '利用総額', formatter: formatCurrencyForExport },
                    ];
                    exportToCSV(filteredCustomers, columns, 'customers');
                    toast.success('顧客データをエクスポートしました');
                  }}
                  disabled={filteredCustomers.length === 0}
                >
                  <Icon name="download" size={14} className="mr-1.5" />
                  CSV
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={fixMissingCustomers} disabled={isFixing}>
                      <Icon name="sync" size={14} className={`mr-2 ${isFixing ? 'animate-spin' : ''}`} />
                      データ同期
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Customer List */}
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <Icon name="people" size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">
                  {searchTerm ? "検索結果がありません" : "このセグメントに該当する顧客はいません"}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-border">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors"
                      onClick={() => setViewingCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground truncate">{customer.name || "-"}</p>
                            {customer.isVip && <Crown className="h-4 w-4 text-amber-500" />}
                            {customer.lineUserId && <MessageSquare className="h-3 w-3 text-[#06C755]" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{customer.phone || "-"}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-foreground tabular-nums">¥{customer.totalSpend?.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{customer.bookingCount}回</p>
                          </div>
                          <Icon name="chevron_right" size={20} className="text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6">名前</TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6">電話番号</TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-12 px-6">メール</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6">利用回数</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6">利用総額</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 w-[180px]">アクション</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/20 border-b border-border/50 transition-colors h-14">
                          <TableCell className="px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{customer.name || "-"}</span>
                              {customer.isVip && (
                                <Crown className="h-4 w-4 text-amber-500" />
                              )}
                              {customer.lineUserId && (
                                <MessageSquare className="h-3.5 w-3.5 text-[#06C755]" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 text-muted-foreground">{customer.phone || "-"}</TableCell>
                          <TableCell className="px-6 text-muted-foreground">{customer.email || "-"}</TableCell>
                          <TableCell className="text-right px-6 font-medium">{customer.bookingCount}回</TableCell>
                          <TableCell className="text-right px-6">
                            <span className="font-bold text-foreground tabular-nums text-lg">
                              ¥{customer.totalSpend?.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => setViewingCustomer(customer)}
                                title="詳細を見る"
                              >
                                <Icon name="visibility" size={16} className="mr-1" />
                                詳細
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 rounded-full ${customer.lineUserId
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
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                onClick={() => handleEdit(customer)}
                                title="編集"
                              >
                                <Icon name="edit" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={() => setDeletingCustomer(customer)}
                                title="削除"
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
          </Card>
        </motion.div>
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

      <CustomerDetailModal
        customer={viewingCustomer}
        open={!!viewingCustomer}
        onOpenChange={(open) => !open && setViewingCustomer(null)}
        onEdit={(customer) => {
          handleEdit(customer);
        }}
        onDelete={(customer) => {
          setDeletingCustomer(customer);
        }}
        onChat={(customer) => {
          setChattingCustomer(customer);
        }}
        onViewAllHistory={(customer) => {
          setViewingBookingHistory(customer);
        }}
      />
    </div>
  );
}
