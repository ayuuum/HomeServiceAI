import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { motion } from 'framer-motion';
import { Users, Send, History, Sparkles } from 'lucide-react';

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

type PresetType = 'all' | 'repeater' | 'new' | 'dormant' | 'active';

const presets: { key: PresetType; label: string; description: string; icon: string }[] = [
  { key: 'all', label: '全員', description: 'LINE連携済み全顧客', icon: 'group' },
  { key: 'repeater', label: 'リピーター', description: '3回以上利用', icon: 'loyalty' },
  { key: 'new', label: '新規', description: '1回以下利用', icon: 'person_add' },
  { key: 'active', label: 'アクティブ', description: '1ヶ月以内に利用', icon: 'bolt' },
  { key: 'dormant', label: '休眠', description: '3ヶ月以上利用なし', icon: 'hotel' },
];

export default function BroadcastPage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<SegmentFilters>(defaultFilters);
  const [activePreset, setActivePreset] = useState<PresetType>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const { data: broadcasts = [], isLoading: isLoadingBroadcasts } = useQuery({
    queryKey: ['broadcasts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('broadcasts' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(10);

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

  const applyPreset = (preset: PresetType) => {
    setActivePreset(preset);
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

  const handleSendBroadcast = async () => {
    if (!organization?.id || !message.trim() || filteredCustomers.length === 0) return;

    try {
      setIsSending(true);

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

      const { data: result, error: sendError } = await supabase.functions.invoke('send-broadcast', {
        body: { broadcastId: typedBroadcast.id },
      });

      if (sendError) throw sendError;
      if (result?.error) throw new Error(result.error);

      toast.success(`${result.sentCount}名に配信しました${result.failedCount > 0 ? `（${result.failedCount}名失敗）` : ''}`);

      setTitle('');
      setMessage('');
      setFilters(defaultFilters);
      setActivePreset('all');

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
  const totalLineCustomers = customers.length;

  // Show onboarding if no LINE customers
  if (!isLoadingCustomers && totalLineCustomers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[#06C755]/5 to-background">
        <AdminHeader />
        <div className="container max-w-xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-none shadow-medium text-center">
              <CardContent className="pt-12 pb-8 px-6">
                <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center mx-auto mb-6">
                  <Send className="h-8 w-8 text-[#06C755]" />
                </div>
                <h2 className="text-xl font-bold mb-3">一斉配信を始めましょう</h2>
                <p className="text-muted-foreground mb-6">
                  LINE連携済みの顧客にメッセージを一斉送信できます。<br />
                  まずは顧客にLINE連携を促しましょう。
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <p className="text-sm">予約完了後に表示されるLINE追加ボタンから友だち追加</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <p className="text-sm">顧客がLINEで予約確認などの通知を受け取れるように</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <p className="text-sm">この画面から一斉配信が可能に！</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#06C755]/5 to-background">
      <AdminHeader />

      <div className="container max-w-4xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Send className="h-5 w-5 text-[#06C755]" />
            一斉配信
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            LINE連携済みの顧客にメッセージを一斉送信
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-medium">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#06C755]/10">
                    <Users className="h-4 w-4 text-[#06C755]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LINE連携顧客</p>
                    <p className="text-xl font-bold">{totalLineCustomers}<span className="text-sm font-normal text-muted-foreground">名</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-none shadow-medium">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">配信履歴</p>
                    <p className="text-xl font-bold">{broadcasts.length}<span className="text-sm font-normal text-muted-foreground">件</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Segment Selection */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-none shadow-medium">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  配信先を選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preset Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => applyPreset(preset.key)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${activePreset === preset.key
                          ? 'border-[#06C755] bg-[#06C755]/5'
                          : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                        }`}
                    >
                      <Icon name={preset.icon} size={20} className={activePreset === preset.key ? 'text-[#06C755]' : 'text-muted-foreground'} />
                      <p className={`font-medium text-sm mt-1 ${activePreset === preset.key ? 'text-[#06C755]' : ''}`}>
                        {preset.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  ))}
                </div>

                {/* Advanced Filters */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} size={18} />
                    詳細条件
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm">予約回数</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="最小"
                            value={filters.minBookingCount ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                minBookingCount: e.target.value ? Number(e.target.value) : null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">〜</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="最大"
                            value={filters.maxBookingCount ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                maxBookingCount: e.target.value ? Number(e.target.value) : null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">回</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">最終予約日</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="date"
                            value={filters.lastBookingAfter ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                lastBookingAfter: e.target.value || null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-40"
                          />
                          <span className="text-muted-foreground">〜</span>
                          <Input
                            type="date"
                            value={filters.lastBookingBefore ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                lastBookingBefore: e.target.value || null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-40"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">利用総額</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="最小"
                            value={filters.minTotalSpend ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                minTotalSpend: e.target.value ? Number(e.target.value) : null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">〜</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="最大"
                            value={filters.maxTotalSpend ?? ''}
                            onChange={(e) => {
                              setFilters(f => ({
                                ...f,
                                maxTotalSpend: e.target.value ? Number(e.target.value) : null,
                              }));
                              setActivePreset('all');
                            }}
                            className="w-28"
                          />
                          <span className="text-sm text-muted-foreground">円</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Target Count */}
                <div className="bg-[#06C755]/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#06C755]" />
                    <span className="font-medium">配信対象</span>
                  </div>
                  {isLoadingCustomers ? (
                    <span className="text-muted-foreground">読み込み中...</span>
                  ) : (
                    <span className="text-2xl font-bold text-[#06C755]">
                      {filteredCustomers.length}
                      <span className="text-sm font-normal text-muted-foreground ml-1">名</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Message Composer */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-none shadow-medium">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="edit" size={18} className="text-primary" />
                  メッセージ作成
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
                  <p className="text-xs text-muted-foreground">内部管理用。顧客には送信されません。</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broadcastMessage">メッセージ本文</Label>
                  <Textarea
                    id="broadcastMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="顧客に送信するメッセージを入力..."
                    rows={6}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{message.length} 文字</span>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white shadow-lg"
                      disabled={!canSend}
                    >
                      {isSending ? (
                        <>
                          <Icon name="sync" size={20} className="mr-2 animate-spin" />
                          配信中...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
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
          </motion.div>

          {/* Broadcast History */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-none shadow-medium">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  配信履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBroadcasts ? (
                  <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
                ) : broadcasts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>配信履歴はまだありません</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {broadcasts.map((broadcast) => (
                      <div
                        key={broadcast.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{broadcast.title}</p>
                            <BroadcastStatusBadge status={broadcast.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{broadcast.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(broadcast.created_at), 'M/d HH:mm', { locale: ja })}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-medium">
                            <span className="text-[#06C755]">{broadcast.sent_count}</span>
                            <span className="text-muted-foreground">/{broadcast.recipient_count}</span>
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
          </motion.div>
        </div>
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
