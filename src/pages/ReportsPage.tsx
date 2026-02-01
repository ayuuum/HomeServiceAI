import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AdminHeader } from '@/components/AdminHeader';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { exportToCSV, formatCurrencyForExport, type ColumnConfig } from '@/lib/exportUtils';
import { TrendingUp, TrendingDown, Minus, Calendar, Users, Banknote, ShoppingBag } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface KPIData {
  totalRevenue: number;
  bookingCount: number;
  averagePrice: number;
  newCustomers: number;
  previousRevenue: number;
  previousBookingCount: number;
  previousAveragePrice: number;
  previousNewCustomers: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState('7');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    bookingCount: 0,
    averagePrice: 0,
    newCustomers: 0,
    previousRevenue: 0,
    previousBookingCount: 0,
    previousAveragePrice: 0,
    previousNewCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const days = parseInt(period);
      const now = new Date();

      // Current period
      const currentStart = startOfDay(subDays(now, days));
      const currentEnd = endOfDay(now);

      // Previous period (same duration, just before current)
      const previousStart = startOfDay(subDays(now, days * 2));
      const previousEnd = endOfDay(subDays(now, days + 1));

      // Fetch current period bookings
      const { data: currentBookings, error: currentError } = await supabase
        .from('bookings')
        .select('*, booking_services(*), customer_id')
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString());

      if (currentError) throw currentError;

      // Fetch previous period bookings
      const { data: previousBookings, error: previousError } = await supabase
        .from('bookings')
        .select('*, booking_services(*), customer_id')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate KPIs
      const currentRevenue = (currentBookings || [])
        .filter(b => b.status === 'approved' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const previousRevenue = (previousBookings || [])
        .filter(b => b.status === 'approved' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const currentCount = currentBookings?.length || 0;
      const previousCount = previousBookings?.length || 0;

      // Count new customers (first booking in current period)
      const currentCustomerIds = new Set((currentBookings || []).map(b => b.customer_id).filter(Boolean));
      const previousCustomerIds = new Set((previousBookings || []).map(b => b.customer_id).filter(Boolean));

      // Fetch all customer IDs who had bookings before the current period
      const { data: existingCustomers } = await supabase
        .from('bookings')
        .select('customer_id')
        .lt('created_at', currentStart.toISOString());

      const existingCustomerIds = new Set((existingCustomers || []).map(b => b.customer_id).filter(Boolean));

      let newCustomerCount = 0;
      currentCustomerIds.forEach(id => {
        if (!existingCustomerIds.has(id)) newCustomerCount++;
      });

      // Previous period new customers
      const { data: beforePreviousCustomers } = await supabase
        .from('bookings')
        .select('customer_id')
        .lt('created_at', previousStart.toISOString());

      const beforePreviousIds = new Set((beforePreviousCustomers || []).map(b => b.customer_id).filter(Boolean));

      let previousNewCustomerCount = 0;
      previousCustomerIds.forEach(id => {
        if (!beforePreviousIds.has(id)) previousNewCustomerCount++;
      });

      setKpiData({
        totalRevenue: currentRevenue,
        bookingCount: currentCount,
        averagePrice: currentCount > 0 ? Math.round(currentRevenue / currentCount) : 0,
        newCustomers: newCustomerCount,
        previousRevenue,
        previousBookingCount: previousCount,
        previousAveragePrice: previousCount > 0 ? Math.round(previousRevenue / previousCount) : 0,
        previousNewCustomers: previousNewCustomerCount,
      });

      processSalesData(currentBookings || [], days);
      processServiceData(currentBookings || []);
      processStatusData(currentBookings || []);
    } catch (error) {
      console.error('レポート読み込みエラー:', error);
      toast({
        variant: "destructive",
        title: "読み込み失敗",
        description: "レポートデータの読み込みに失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processSalesData = (bookings: any[], days: number) => {
    const salesByDate: { [key: string]: number } = {};
    const today = new Date();

    // Initialize all dates with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'MM/dd', { locale: ja });
      salesByDate[dateStr] = 0;
    }

    bookings
      .filter(b => b.status === 'approved' || b.status === 'completed')
      .forEach((booking) => {
        const date = format(new Date(booking.created_at), 'MM/dd', { locale: ja });
        if (salesByDate[date] !== undefined) {
          salesByDate[date] += booking.total_price || 0;
        }
      });

    const data = Object.entries(salesByDate).map(([date, amount]) => ({
      date,
      売上: amount,
    }));

    setSalesData(data);
  };

  const processServiceData = (bookings: any[]) => {
    const serviceCount: { [key: string]: number } = {};

    bookings.forEach((booking) => {
      booking.booking_services?.forEach((bs: any) => {
        serviceCount[bs.service_title] = (serviceCount[bs.service_title] || 0) + bs.service_quantity;
      });
    });

    const data = Object.entries(serviceCount)
      .map(([name, value]) => ({
        name,
        予約数: value,
      }))
      .sort((a, b) => b.予約数 - a.予約数)
      .slice(0, 5); // Top 5 services

    setServiceData(data);
  };

  const processStatusData = (bookings: any[]) => {
    const statusCount: { [key: string]: number } = {};
    const statusLabels: { [key: string]: string } = {
      pending: '保留中',
      approved: '承認済み',
      rejected: '却下',
      completed: '完了',
      cancelled: 'キャンセル',
    };

    bookings.forEach((booking) => {
      const status = statusLabels[booking.status] || '不明';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const data = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));

    setStatusData(data);
  };

  const calculateChange = (current: number, previous: number): { percent: number; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) {
      return { percent: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
    }
    const percent = Math.round(((current - previous) / previous) * 100);
    return {
      percent: Math.abs(percent),
      trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
    };
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const periodLabel = period === '7' ? '前週比' : period === '14' ? '前2週比' : period === '30' ? '前月比' : '前期比';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold">経営ダッシュボード</h1>
            <p className="text-muted-foreground text-sm mt-1">売上と予約の統計情報</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">過去7日間</SelectItem>
              <SelectItem value="14">過去14日間</SelectItem>
              <SelectItem value="30">過去30日間</SelectItem>
              <SelectItem value="90">過去90日間</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground text-sm">データを読み込んでいます...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                {
                  title: '売上',
                  value: kpiData.totalRevenue,
                  previous: kpiData.previousRevenue,
                  format: (v: number) => `¥${v.toLocaleString()}`,
                  icon: Banknote,
                  color: 'text-emerald-500',
                  bgColor: 'bg-emerald-500/10',
                },
                {
                  title: '予約数',
                  value: kpiData.bookingCount,
                  previous: kpiData.previousBookingCount,
                  format: (v: number) => `${v}件`,
                  icon: Calendar,
                  color: 'text-blue-500',
                  bgColor: 'bg-blue-500/10',
                },
                {
                  title: '平均単価',
                  value: kpiData.averagePrice,
                  previous: kpiData.previousAveragePrice,
                  format: (v: number) => `¥${v.toLocaleString()}`,
                  icon: ShoppingBag,
                  color: 'text-purple-500',
                  bgColor: 'bg-purple-500/10',
                },
                {
                  title: '新規顧客',
                  value: kpiData.newCustomers,
                  previous: kpiData.previousNewCustomers,
                  format: (v: number) => `${v}人`,
                  icon: Users,
                  color: 'text-orange-500',
                  bgColor: 'bg-orange-500/10',
                },
              ].map((kpi, index) => {
                const change = calculateChange(kpi.value, kpi.previous);
                return (
                  <motion.div
                    key={kpi.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-none shadow-medium hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                            <kpi.icon className={`h-4 w-4 md:h-5 md:w-5 ${kpi.color}`} />
                          </div>
                          <div className={`flex items-center gap-1 text-xs font-medium ${change.trend === 'up' ? 'text-emerald-500' :
                              change.trend === 'down' ? 'text-red-500' :
                                'text-muted-foreground'
                            }`}>
                            <TrendIcon trend={change.trend} />
                            <span>{change.percent}%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{kpi.title}</p>
                          <p className="text-xl md:text-2xl font-bold tracking-tight">
                            {kpi.format(kpi.value)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {periodLabel}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Sales Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-none shadow-medium">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg font-bold">売上推移</CardTitle>
                    <CardDescription>日別の売上金額</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const columns: ColumnConfig[] = [
                        { key: 'date', header: '日付' },
                        { key: '売上', header: '売上金額', formatter: formatCurrencyForExport },
                      ];
                      exportToCSV(salesData, columns, 'sales_report');
                      toast({
                        title: 'エクスポート完了',
                        description: '売上レポートをCSVファイルでダウンロードしました',
                      });
                    }}
                    disabled={salesData.length === 0}
                  >
                    <Icon name="download" size={14} className="mr-1.5" />
                    CSV
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {salesData.every(d => d.売上 === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Icon name="trending_up" size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">この期間の売上データはありません</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
                      <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          dy={10}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-medium)'
                          }}
                          formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上']}
                        />
                        <Area
                          type="monotone"
                          dataKey="売上"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Bottom Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Service Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-none shadow-medium h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg font-bold">人気サービス TOP5</CardTitle>
                    <CardDescription>予約数が多いサービス</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {serviceData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Icon name="category" size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">サービスデータがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220} className="md:!h-[260px]">
                        <BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            width={100}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-medium)'
                            }}
                          />
                          <Bar dataKey="予約数" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Status Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-none shadow-medium h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg font-bold">予約ステータス</CardTitle>
                    <CardDescription>ステータス別の予約数</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {statusData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Icon name="pie_chart" size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">ステータスデータがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220} className="md:!h-[260px]">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-medium)'
                            }}
                            formatter={(value: number, name: string) => [`${value}件`, name]}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
