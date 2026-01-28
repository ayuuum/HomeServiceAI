import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdminHeader } from '@/components/AdminHeader';

import { Icon } from '@/components/ui/icon';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { exportToCSV, formatCurrencyForExport, type ColumnConfig } from '@/lib/exportUtils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function ReportsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState('7');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, booking_services(*)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      processSalesData(bookings || []);
      processServiceData(bookings || []);
      processStatusData(bookings || []);
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

  const processSalesData = (bookings: any[]) => {
    const salesByDate: { [key: string]: number } = {};
    const days = parseInt(period);
    const today = new Date();

    // Initialize all dates with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'MM/dd', { locale: ja });
      salesByDate[dateStr] = 0;
    }

    bookings.forEach((booking) => {
      const date = format(new Date(booking.created_at), 'MM/dd', { locale: ja });
      if (salesByDate[date] !== undefined) {
        salesByDate[date] += booking.total_price;
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

    const data = Object.entries(serviceCount).map(([name, value]) => ({
      name,
      予約数: value,
    }));

    setServiceData(data);
  };

  const processStatusData = (bookings: any[]) => {
    const statusCount: { [key: string]: number } = {};

    bookings.forEach((booking) => {
      const status = booking.status === 'pending' ? '保留中' :
        booking.status === 'approved' ? '承認済み' :
          booking.status === 'rejected' ? '却下' :
            booking.status === 'completed' ? '完了' :
              booking.status === 'cancelled' ? 'キャンセル' : '不明';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const data = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));

    setStatusData(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="md:col-span-2 shadow-subtle border-none">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">売上推移</CardTitle>
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
                    CSVエクスポート
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={250} className="md:!h-[350px]">
                    <LineChart data={salesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                        tickFormatter={(value) => `¥${value.toLocaleString()}`}
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
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="売上"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2, stroke: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-subtle border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">サービス別予約数</CardTitle>
                  <CardDescription>人気のサービス</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={220} className="md:!h-[300px]">
                    <BarChart data={serviceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        interval="preserveStartEnd"
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-medium)'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="予約数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-subtle border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">予約ステータス</CardTitle>
                  <CardDescription>ステータス別の予約数</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={220} className="md:!h-[300px]">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
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
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
