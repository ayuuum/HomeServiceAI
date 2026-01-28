import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SegmentFilters {
  minBookingCount: number | null;
  maxBookingCount: number | null;
  lastBookingBefore: string | null;
  lastBookingAfter: string | null;
  minTotalSpend: number | null;
  maxTotalSpend: number | null;
}

interface CustomerWithBookings {
  id: string;
  name: string;
  line_user_id: string | null;
  bookings: Array<{
    id: string;
    total_price: number | null;
    selected_date: string;
    status: string;
  }>;
}

const defaultFilters: SegmentFilters = {
  minBookingCount: null,
  maxBookingCount: null,
  lastBookingBefore: null,
  lastBookingAfter: null,
  minTotalSpend: null,
  maxTotalSpend: null,
};

export default function BroadcastPage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Segment filter state
  const [filters, setFilters] = useState<SegmentFilters>(defaultFilters);

  // Message state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Sending state
  const [isSending, setIsSending] = useState(false);

  // Fetch all LINE-connected customers with bookings
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['broadcast-customers', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, line_user_id, bookings(id, total_price, selected_date, status)')
        .eq('organization_id', organization.id)
        .not('line_user_id', 'is', null);

      if (error) throw error;
      return (data || []) as CustomerWithBookings[];
    },
    enabled: !!organization?.id,
  });

  // Fetch broadcast history
  const { data: broadcasts = [], isLoading: isLoadingBroadcasts } = useQuery({
    queryKey: ['broadcasts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('broadcasts' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as unknown) as Array<{
        id: string;
        organization_id: string;
        title: string;
        message: string;
        segment_filters: Record<string, unknown>;
        recipient_count: number;
        sent_count: number;
        failed_count: number;
        status: string;
        created_at: string;
        updated_at: string;
      }> || [];
    },
    enabled: !!organization?.id,
  });

  // Filter customers based on segment
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      if (!customer.line_user_id) return false;

      const completedBookings = customer.bookings.filter(b => b.status !== 'cancelled');
      const bookingCount = completedBookings.length;
      const totalSpend = completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      const sortedDates = completedBookings
        .map(b => b.selected_date)
        .sort((a, b) => b.localeCompare(a));
      const lastBookingDate = sortedDates[0] || null;

      // Apply filters
      if (filters.minBookingCount !== null && bookingCount < filters.minBookingCount) return false;
      if (filters.maxBookingCount !== null && bookingCount > filters.maxBookingCount) return false;

      if (filters.lastBookingBefore !== null) {
        if (!lastBookingDate || lastBookingDate > filters.lastBookingBefore) return false;
      }
      if (filters.lastBookingAfter !== null) {
        if (!lastBookingDate || lastBookingDate < filters.lastBookingAfter) return false;
      }

      if (filters.minTotalSpend !== null && totalSpend < filters.minTotalSpend) return false;
      if (filters.maxTotalSpend !== null && totalSpend > filters.maxTotalSpend) return false;

      return true;
    });
  }, [customers, filters]);

  // Helper to apply presets
  const applyPreset = (preset: 'repeater' | 'new' | 'dormant' | 'active' | 'all') => {
    switch (preset) {
      case 'repeater':
        setFilters({ ...defaultFilters, minBookingCount: 3 });
        break;
      case 'new':
        setFilters({ ...defaultFilters, maxBookingCount: 1 });
        break;
      case 'dormant': {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        setFilters({
          ...defaultFilters,
          lastBookingBefore: threeMonthsAgo.toISOString().split('T')[0],
        });
        break;
      }
      case 'active': {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        setFilters({
          ...defaultFilters,
          lastBookingAfter: oneMonthAgo.toISOString().split('T')[0],
        });
        break;
      }
      case 'all':
        setFilters(defaultFilters);
        break;
    }
  };

  // Send broadcast
  const handleSendBroadcast = async () => {
    if (!organization?.id || !message.trim() || filteredCustomers.length === 0) return;

    try {
      setIsSending(true);

      // 1. Create broadcast record
      const segmentFilters: Record<string, unknown> = {};
      if (filters.minBookingCount !== null) segmentFilters.min_booking_count = filters.minBookingCount;
      if (filters.maxBookingCount !== null) segmentFilters.max_booking_count = filters.maxBookingCount;
      if (filters.lastBookingBefore !== null) segmentFilters.last_booking_before = filters.lastBookingBefore;
      if (filters.lastBookingAfter !== null) segmentFilters.last_booking_after = filters.lastBookingAfter;
      if (filters.minTotalSpend !== null) segmentFilters.min_total_spend = filters.minTotalSpend;
      if (filters.maxTotalSpend !== null) segmentFilters.max_total_spend = filters.maxTotalSpend;
      segmentFilters.line_connected_only = true;

      const { data: broadcast, error: createError } = await supabase
        .from('broadcasts' as any)
        .insert({
          organization_id: organization.id,
          title: title.trim() || `配信 ${format(new Date(), 'yyyy/MM/dd HH:mm')}`,
          message: message.trim(),
          segment_filters: segmentFilters,
          recipient_count: filteredCustomers.length,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;
      const typedBroadcast = (broadcast as unknown) as { id: string };

      // 2. Insert recipients
      const recipients = filteredCustomers.map(c => ({
        broadcast_id: typedBroadcast.id,
        customer_id: c.id,
        line_user_id: c.line_user_id!,
        status: 'pending' as const,
      }));

      const { error: recipientsError } = await supabase
        .from('broadcast_recipients' as any)
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      // 3. Invoke send-broadcast edge function
      const { data: result, error: sendError } = await supabase.functions.invoke('send-broadcast', {
        body: { broadcastId: typedBroadcast.id },
      });

      if (sendError) throw sendError;
      if (result?.error) throw new Error(result.error);

      toast.success(`${result.sentCount}名に配信しました${result.failedCount > 0 ? `（${result.failedCount}名失敗）` : ''}`);

      // Reset form
      setTitle('');
      setMessage('');
      setFilters(defaultFilters);

      // Refresh broadcast history
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error(error instanceof Error ? error.message : '配信に失敗しました');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    } finally {
      setIsSending(false);
    }
  };

  const canSend = message.trim().length > 0 && filteredCustomers.length > 0 && !isSending;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      {/* Page Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Icon name="campaign" size={28} className="text-[#06C755]" />
            一斉配信
          </h1>
          <p className="text-muted-foreground mt-1">
            セグメントを指定してLINE連携済みの顧客にメッセージを一斉送信します
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Segment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="filter_list" size={20} className="text-primary" />
              配信先セグメント
            </CardTitle>
            <CardDescription>
              条件を設定して配信対象を絞り込みます。LINE連携済みの顧客のみが対象です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">プリセット</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset('all')}>
                  全員
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('repeater')}>
                  リピーター（3回以上）
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('new')}>
                  新規（1回以下）
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('dormant')}>
                  休眠（3ヶ月以上）
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('active')}>
                  アクティブ（1ヶ月以内）
                </Button>
              </div>
            </div>

            <Separator />

            {/* Booking Count Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">予約回数</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="最小"
                  value={filters.minBookingCount ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    minBookingCount: e.target.value ? Number(e.target.value) : null,
                  }))}
                  className="w-full md:w-28"
                />
                <span className="text-muted-foreground hidden md:inline">〜</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="最大"
                  value={filters.maxBookingCount ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    maxBookingCount: e.target.value ? Number(e.target.value) : null,
                  }))}
                  className="w-full md:w-28"
                />
                <span className="text-sm text-muted-foreground">回</span>
              </div>
            </div>

            {/* Last Booking Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">最終予約日</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={filters.lastBookingAfter ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    lastBookingAfter: e.target.value || null,
                  }))}
                  className="w-full md:w-44"
                />
                <span className="text-muted-foreground hidden md:inline">〜</span>
                <Input
                  type="date"
                  value={filters.lastBookingBefore ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    lastBookingBefore: e.target.value || null,
                  }))}
                  className="w-full md:w-44"
                />
              </div>
            </div>

            {/* Total Spend Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">利用総額</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="最小"
                  value={filters.minTotalSpend ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    minTotalSpend: e.target.value ? Number(e.target.value) : null,
                  }))}
                  className="w-full md:w-32"
                />
                <span className="text-muted-foreground hidden md:inline">〜</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="最大"
                  value={filters.maxTotalSpend ?? ''}
                  onChange={(e) => setFilters(f => ({
                    ...f,
                    maxTotalSpend: e.target.value ? Number(e.target.value) : null,
                  }))}
                  className="w-full md:w-32"
                />
                <span className="text-sm text-muted-foreground">円</span>
              </div>
            </div>

            <Separator />

            {/* Preview */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="group" size={20} className="text-[#06C755]" />
                <span className="font-medium">配信対象</span>
              </div>
              <div className="text-right">
                {isLoadingCustomers ? (
                  <span className="text-muted-foreground">読み込み中...</span>
                ) : (
                  <span className="text-2xl font-bold text-[#06C755]">
                    {filteredCustomers.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">名</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="edit" size={20} className="text-primary" />
              メッセージ内容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcastTitle">配信タイトル（管理用）</Label>
              <Input
                id="broadcastTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 年末キャンペーンのお知らせ"
              />
              <p className="text-xs text-muted-foreground">内部管理用です。顧客には送信されません。</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcastMessage">メッセージ本文</Label>
              <Textarea
                id="broadcastMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="顧客に送信するメッセージを入力してください..."
                rows={6}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{message.length} 文字</span>
              </div>
            </div>

            {/* Send Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
                  disabled={!canSend}
                >
                  {isSending ? (
                    <>
                      <Icon name="sync" size={20} className="mr-2 animate-spin" />
                      配信中...
                    </>
                  ) : (
                    <>
                      <Icon name="send" size={20} className="mr-2" />
                      配信する（{filteredCustomers.length}名）
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>配信を実行しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    {filteredCustomers.length}名のLINE連携済み顧客にメッセージを送信します。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSendBroadcast}
                    className="bg-[#06C755] hover:bg-[#06C755]/90"
                  >
                    配信する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Broadcast History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="history" size={20} className="text-primary" />
              配信履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBroadcasts ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="campaign" size={48} className="mx-auto mb-3 opacity-30" />
                <p>配信履歴はまだありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-2 md:gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate text-sm md:text-base">{broadcast.title}</p>
                        <BroadcastStatusBadge status={broadcast.status} />
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{broadcast.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(broadcast.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </p>
                    </div>
                    <div className="text-left md:text-right shrink-0 flex md:block items-center gap-2">
                      <p className="text-sm font-medium">
                        <span className="text-[#06C755]">{broadcast.sent_count}</span>
                        <span className="text-muted-foreground">/{broadcast.recipient_count}名</span>
                      </p>
                      {broadcast.failed_count > 0 && (
                        <p className="text-xs text-destructive">{broadcast.failed_count}件失敗</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BroadcastStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline">下書き</Badge>;
    case 'sending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">送信中</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">完了</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">失敗</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
