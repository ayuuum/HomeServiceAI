import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileNav } from '@/components/MobileNav';
import { useStore } from '@/contexts/StoreContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function ReportsPage() {
  const { toast } = useToast();
  const { selectedStoreId } = useStore();
  const [period, setPeriod] = useState('7');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [period, selectedStoreId]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, booking_services(*)')
        .eq('store_id', selectedStoreId)
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

    bookings.forEach((booking) => {
      const date = format(new Date(booking.created_at), 'MM/dd', { locale: ja });
      salesByDate[date] = (salesByDate[date] || 0) + booking.total_price;
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">レポート・分析</h1>
            <p className="text-muted-foreground mt-2">売上と予約の統計情報</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>売上推移</CardTitle>
                <CardDescription>日別の売上金額</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="売上" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>サービス別予約数</CardTitle>
                  <CardDescription>人気のサービス</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="予約数" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>予約ステータス</CardTitle>
                  <CardDescription>ステータス別の予約数</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
