 import { useState, useEffect } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
 import { ja } from 'date-fns/locale';
 import { motion } from 'framer-motion';
 import { Banknote, CreditCard, Building2, Wallet, FileText, ExternalLink, Loader2, Receipt } from 'lucide-react';
 import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
 
 interface MonthlyBilling {
   id: string;
   billing_month: string;
   gmv_total: number;
   gmv_cash: number;
   gmv_bank_transfer: number;
   gmv_online: number;
   booking_count: number;
   fee_percent: number;
   fee_total: number;
   invoice_status: string;
   hosted_invoice_url: string | null;
   issued_at: string | null;
   due_at: string | null;
   paid_at: string | null;
 }
 
 interface CompletedBooking {
   id: string;
   customer_name: string;
   selected_date: string;
   final_amount: number;
  total_price?: number;
   payment_method: string;
   gmv_included_at: string;
   booking_services: { service_title: string }[];
 }
 
 const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];
 
 const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
   draft: { label: '下書き', variant: 'secondary' },
   issued: { label: '発行済み', variant: 'default' },
   paid: { label: '支払済み', variant: 'default' },
   overdue: { label: '支払い遅延', variant: 'destructive' },
   void: { label: '無効', variant: 'outline' },
 };
 
 const paymentMethodLabels: Record<string, string> = {
   cash: '現金',
   bank_transfer: '銀行振込',
   online_card: 'カード決済',
   other: 'その他',
 };
 
 export function MonthlyBillingReport() {
   const { toast } = useToast();
   const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
   const [billing, setBilling] = useState<MonthlyBilling | null>(null);
   const [bookings, setBookings] = useState<CompletedBooking[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isGenerating, setIsGenerating] = useState(false);
 
   // Generate month options (last 12 months)
   const monthOptions = Array.from({ length: 12 }, (_, i) => {
     const date = subMonths(new Date(), i);
     return {
       value: format(date, 'yyyy-MM'),
       label: format(date, 'yyyy年M月', { locale: ja }),
     };
   });
 
   useEffect(() => {
     loadBillingData();
   }, [selectedMonth]);
 
   const loadBillingData = async () => {
     try {
       setIsLoading(true);
 
       // Load monthly billing record
       const { data: billingData, error: billingError } = await supabase
         .from('monthly_billing')
         .select('*')
         .eq('billing_month', selectedMonth)
         .maybeSingle();
 
       if (billingError) throw billingError;
       setBilling(billingData);
 
       // Load completed bookings for the month
       const [year, month] = selectedMonth.split('-').map(Number);
       const monthStart = startOfMonth(new Date(year, month - 1));
       const monthEnd = endOfMonth(new Date(year, month - 1));
 
      // GMVは予約確定時（confirmed）に計上されるため、confirmed + completed を対象にする
       const { data: bookingsData, error: bookingsError } = await supabase
         .from('bookings')
         .select(`
           id,
           customer_name,
           selected_date,
           final_amount,
          total_price,
           payment_method,
           gmv_included_at,
           booking_services (service_title)
         `)
        .in('status', ['confirmed', 'completed'])
         .not('gmv_included_at', 'is', null)
         .gte('gmv_included_at', monthStart.toISOString())
         .lte('gmv_included_at', monthEnd.toISOString())
         .order('gmv_included_at', { ascending: false });
 
       if (bookingsError) throw bookingsError;
       setBookings(bookingsData || []);
 
     } catch (error) {
       console.error('Failed to load billing data:', error);
       toast({
         variant: 'destructive',
         title: '読み込みエラー',
         description: '請求データの読み込みに失敗しました',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleGenerateBilling = async () => {
     try {
       setIsGenerating(true);
 
       const { data, error } = await supabase.functions.invoke('generate-monthly-billing', {
         body: { month: selectedMonth },
       });
 
       if (error) throw error;
 
       toast({
         title: '請求書生成完了',
         description: data.message || '月次請求書を生成しました',
       });
 
       loadBillingData();
     } catch (error) {
       console.error('Failed to generate billing:', error);
       toast({
         variant: 'destructive',
         title: '生成エラー',
         description: '請求書の生成に失敗しました',
       });
     } finally {
       setIsGenerating(false);
     }
   };
 
   // Calculate GMV from bookings if no billing record
    // final_amountがあればそれを使用、なければtotal_priceを使用
    const getAmount = (b: CompletedBooking) => b.final_amount || b.total_price || 0;
    const calculatedGmv = bookings.reduce((sum, b) => sum + getAmount(b), 0);
    const calculatedCash = bookings.filter(b => b.payment_method === 'cash').reduce((sum, b) => sum + getAmount(b), 0);
    const calculatedTransfer = bookings.filter(b => b.payment_method === 'bank_transfer').reduce((sum, b) => sum + getAmount(b), 0);
    const calculatedOnline = bookings.filter(b => b.payment_method === 'online_card').reduce((sum, b) => sum + getAmount(b), 0);
 
   const gmvTotal = billing?.gmv_total ?? calculatedGmv;
   const gmvCash = billing?.gmv_cash ?? calculatedCash;
   const gmvTransfer = billing?.gmv_bank_transfer ?? calculatedTransfer;
   const gmvOnline = billing?.gmv_online ?? calculatedOnline;
   const feePercent = billing?.fee_percent ?? 7;
   const feeTotal = billing?.fee_total ?? Math.round(gmvTotal * (feePercent / 100));
 
   const pieData = [
     { name: '現金', value: gmvCash },
     { name: '振込', value: gmvTransfer },
     { name: 'カード', value: gmvOnline },
   ].filter(d => d.value > 0);
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-lg font-bold">月次利用料レポート</h2>
            <p className="text-sm text-muted-foreground">月間売上集計とサービス利用料</p>
         </div>
         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
           <SelectTrigger className="w-full md:w-[180px]">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {monthOptions.map(opt => (
               <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {isLoading ? (
         <div className="flex items-center justify-center py-12">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
       ) : (
         <>
           {/* GMV Summary Cards */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <Card className="border-none shadow-medium">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 rounded-lg bg-emerald-500/10">
                       <Banknote className="h-4 w-4 text-emerald-500" />
                     </div>
                   </div>
                    <p className="text-xs text-muted-foreground">月間売上</p>
                   <p className="text-xl font-bold">¥{gmvTotal.toLocaleString()}</p>
                 </CardContent>
               </Card>
             </motion.div>
 
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
               <Card className="border-none shadow-medium">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 rounded-lg bg-green-500/10">
                       <Wallet className="h-4 w-4 text-green-500" />
                     </div>
                   </div>
                   <p className="text-xs text-muted-foreground">現金</p>
                   <p className="text-xl font-bold">¥{gmvCash.toLocaleString()}</p>
                 </CardContent>
               </Card>
             </motion.div>
 
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
               <Card className="border-none shadow-medium">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 rounded-lg bg-blue-500/10">
                       <Building2 className="h-4 w-4 text-blue-500" />
                     </div>
                   </div>
                   <p className="text-xs text-muted-foreground">振込</p>
                   <p className="text-xl font-bold">¥{gmvTransfer.toLocaleString()}</p>
                 </CardContent>
               </Card>
             </motion.div>
 
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
               <Card className="border-none shadow-medium">
                 <CardContent className="p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 rounded-lg bg-purple-500/10">
                       <CreditCard className="h-4 w-4 text-purple-500" />
                     </div>
                   </div>
                   <p className="text-xs text-muted-foreground">カード決済</p>
                   <p className="text-xl font-bold">¥{gmvOnline.toLocaleString()}</p>
                 </CardContent>
               </Card>
             </motion.div>
           </div>
 
           {/* Fee & Invoice Section */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Platform Fee Card */}
             <Card className="border-none shadow-medium">
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-bold flex items-center gap-2">
                   <Receipt className="h-4 w-4" />
                    サービス利用料
                 </CardTitle>
                  <CardDescription>月間売上 × {feePercent}%</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">請求額</span>
                   <span className="text-2xl font-bold">¥{feeTotal.toLocaleString()}</span>
                 </div>
 
                 {billing ? (
                   <div className="space-y-3">
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">ステータス</span>
                       <Badge variant={statusLabels[billing.invoice_status]?.variant || 'secondary'}>
                         {statusLabels[billing.invoice_status]?.label || billing.invoice_status}
                       </Badge>
                     </div>
                     {billing.due_at && (
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground">支払期限</span>
                         <span>{format(new Date(billing.due_at), 'yyyy/MM/dd')}</span>
                       </div>
                     )}
                     {billing.paid_at && (
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground">支払日</span>
                         <span>{format(new Date(billing.paid_at), 'yyyy/MM/dd')}</span>
                       </div>
                     )}
                     {billing.hosted_invoice_url && (
                       <Button variant="outline" className="w-full" asChild>
                         <a href={billing.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                           <FileText className="h-4 w-4 mr-2" />
                           請求書を表示
                           <ExternalLink className="h-3 w-3 ml-2" />
                         </a>
                       </Button>
                     )}
                   </div>
                 ) : (
                   <div className="space-y-3">
                     <p className="text-sm text-muted-foreground">
                       この月の請求書はまだ生成されていません。
                     </p>
                     <Button
                       onClick={handleGenerateBilling}
                       disabled={isGenerating || gmvTotal === 0}
                       className="w-full"
                     >
                       {isGenerating ? (
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       ) : (
                         <FileText className="h-4 w-4 mr-2" />
                       )}
                       請求書を生成
                     </Button>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {/* GMV Breakdown Pie Chart */}
             <Card className="border-none shadow-medium">
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-bold">決済方法内訳</CardTitle>
                 <CardDescription>予約件数: {bookings.length}件</CardDescription>
               </CardHeader>
               <CardContent>
                 {pieData.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                     <Banknote className="h-12 w-12 mb-4 opacity-20" />
                     <p className="text-sm">売上データがありません</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height={200}>
                     <PieChart>
                       <Pie
                         data={pieData}
                         cx="50%"
                         cy="50%"
                         innerRadius={50}
                         outerRadius={70}
                         paddingAngle={3}
                         dataKey="value"
                       >
                         {pieData.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                         ))}
                       </Pie>
                       <Tooltip
                         contentStyle={{
                           backgroundColor: 'hsl(var(--card))',
                           border: 'none',
                           borderRadius: '8px',
                         }}
                         formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                       />
                       <Legend verticalAlign="bottom" height={36} />
                     </PieChart>
                   </ResponsiveContainer>
                 )}
               </CardContent>
             </Card>
           </div>
 
           {/* GMV Detail Table */}
           <Card className="border-none shadow-medium">
             <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">売上明細</CardTitle>
                <CardDescription>売上計上済みの予約一覧</CardDescription>
             </CardHeader>
             <CardContent>
               {bookings.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                   <FileText className="h-12 w-12 mb-4 opacity-20" />
                   <p className="text-sm">この月の完了予約はありません</p>
                 </div>
               ) : (
                 <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>日付</TableHead>
                         <TableHead>顧客名</TableHead>
                         <TableHead>サービス</TableHead>
                         <TableHead className="text-right">金額</TableHead>
                         <TableHead>決済</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {bookings.map(booking => (
                         <TableRow key={booking.id}>
                           <TableCell className="whitespace-nowrap">
                             {format(new Date(booking.selected_date), 'M/d')}
                           </TableCell>
                           <TableCell>{booking.customer_name}</TableCell>
                           <TableCell className="max-w-[150px] truncate">
                             {booking.booking_services?.map(s => s.service_title).join(', ') || '-'}
                           </TableCell>
                           <TableCell className="text-right font-medium">
                             ¥{(booking.final_amount || 0).toLocaleString()}
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className="text-xs">
                               {paymentMethodLabels[booking.payment_method] || booking.payment_method}
                             </Badge>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </div>
               )}
             </CardContent>
           </Card>
         </>
       )}
     </div>
   );
 }