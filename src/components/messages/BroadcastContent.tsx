/**
 * BroadcastContent - extracted from BroadcastPage for use in MessagesPage tabs.
 * Renders the broadcast composer and history without AdminHeader.
 */
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export default function BroadcastContent() {
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
        title: string;
        message: string;
        recipient_count: number;
        sent_count: number;
        failed_count: number;
        status: string;
        created_at: string;
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
      const sortedDates = completedBookings.map(b => b.selected_date).sort((a, b) => b.localeCompare(a));
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
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        setFilters({ ...defaultFilters, lastBookingBefore: d.toISOString().split('T')[0] });
        break;
      }
      case 'active': {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        setFilters({ ...defaultFilters, lastBookingAfter: d.toISOString().split('T')[0] });
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
      const { error: recipientsError } = await supabase.from('broadcast_recipients' as any).insert(recipients);
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

  if (!isLoadingCustomers && totalLineCustomers === 0) {
    return (
      <div className="max-w-xl mx-auto py-12">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Segment Selection */}
      <Card className="border-none shadow-medium">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            配信先を選択
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset.key)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  activePreset === preset.key
                    ? 'border-[#06C755] bg-[#06C755]/5'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                }`}
              >
                <Icon name={preset.icon} size={20} className={activePreset === preset.key ? 'text-[#06C755]' : 'text-muted-foreground'} />
                <p className={`font-medium text-sm mt-1 ${activePreset === preset.key ? 'text-[#06C755]' : ''}`}>{preset.label}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} size={18} />
            詳細条件
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm">予約回数</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" placeholder="最小" value={filters.minBookingCount ?? ''} onChange={(e) => { setFilters(f => ({ ...f, minBookingCount: e.target.value ? Number(e.target.value) : null })); setActivePreset('all'); }} className="w-24" />
                  <span className="text-muted-foreground">〜</span>
                  <Input type="number" min="0" placeholder="最大" value={filters.maxBookingCount ?? ''} onChange={(e) => { setFilters(f => ({ ...f, maxBookingCount: e.target.value ? Number(e.target.value) : null })); setActivePreset('all'); }} className="w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">累計利用額</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" placeholder="最小 (円)" value={filters.minTotalSpend ?? ''} onChange={(e) => { setFilters(f => ({ ...f, minTotalSpend: e.target.value ? Number(e.target.value) : null })); setActivePreset('all'); }} className="w-28" />
                  <span className="text-muted-foreground">〜</span>
                  <Input type="number" min="0" placeholder="最大 (円)" value={filters.maxTotalSpend ?? ''} onChange={(e) => { setFilters(f => ({ ...f, maxTotalSpend: e.target.value ? Number(e.target.value) : null })); setActivePreset('all'); }} className="w-28" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="bg-[#06C755]/10 text-[#06C755] border-[#06C755]/30">
              対象: {filteredCustomers.length}名
            </Badge>
            <span className="text-xs text-muted-foreground">/ {totalLineCustomers}名中</span>
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card className="border-none shadow-medium">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-[#06C755]" />
            メッセージ作成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="broadcastTitle">タイトル（管理用・任意）</Label>
            <Input id="broadcastTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 12月キャンペーンのお知らせ" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="broadcastMessage">メッセージ内容 *</Label>
            <Textarea id="broadcastMessage" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="お客様に送信するメッセージを入力..." rows={5} className="resize-none" />
            <p className="text-xs text-muted-foreground">{message.length}/500文字</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canSend} className="w-full bg-[#06C755] hover:bg-[#06C755]/90 text-white h-12 text-base font-bold">
                {isSending ? <Icon name="sync" size={20} className="mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
                {filteredCustomers.length}名に配信する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>配信を実行しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  {filteredCustomers.length}名のLINE顧客にメッセージを送信します。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendBroadcast} className="bg-[#06C755] hover:bg-[#06C755]/90">配信する</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Broadcast History */}
      {broadcasts.length > 0 && (
        <Card className="border-none shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              配信履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {broadcasts.map((bc) => (
                <div key={bc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{bc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(bc.created_at), 'M/d HH:mm', { locale: ja })} · {bc.sent_count}/{bc.recipient_count}名送信
                    </p>
                  </div>
                  <Badge variant={bc.status === 'sent' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                    {bc.status === 'sent' ? '送信済み' : bc.status === 'draft' ? '下書き' : bc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
