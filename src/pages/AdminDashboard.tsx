import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Calendar, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Mock booking data
const mockBookings = [
  {
    id: "1",
    serviceName: "エアコンクリーニング",
    customerName: "田中 太郎",
    totalPrice: 19000,
    status: "pending" as const,
    selectedDate: "2025-01-25",
    selectedTime: "10:00",
    optionsSummary: ["お掃除機能付きエアコン", "防カビコート"],
    createdAt: "2025-01-20T10:30:00",
  },
  {
    id: "2",
    serviceName: "キッチン掃除",
    customerName: "佐藤 花子",
    totalPrice: 19000,
    status: "confirmed" as const,
    selectedDate: "2025-01-23",
    selectedTime: "14:00",
    optionsSummary: ["換気扇分解洗浄"],
    createdAt: "2025-01-19T15:20:00",
  },
  {
    id: "3",
    serviceName: "バスルームクリーニング",
    customerName: "鈴木 一郎",
    totalPrice: 18000,
    status: "pending" as const,
    selectedDate: "2025-01-26",
    selectedTime: "09:00",
    optionsSummary: ["防カビコーティング", "鏡のウロコ取り"],
    createdAt: "2025-01-20T09:15:00",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
          <Clock className="h-3 w-3 mr-1" />
          承認待ち
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          確定済み
        </Badge>
      );
    default:
      return null;
  }
};

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">予約管理ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">
            新着の予約リクエストを確認・管理できます
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    承認待ち
                  </p>
                  <p className="text-3xl font-bold text-accent">2</p>
                </div>
                <Clock className="h-12 w-12 text-accent/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    確定済み
                  </p>
                  <p className="text-3xl font-bold text-success">1</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-success/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    今月の売上
                  </p>
                  <p className="text-3xl font-bold text-primary">¥56,000</p>
                </div>
                <Calendar className="h-12 w-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <Card>
          <CardHeader>
            <CardTitle>予約リスト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockBookings.map((booking, index) => (
                <div key={booking.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {booking.serviceName}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {booking.customerName}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          ¥{booking.totalPrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">税込</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.selectedDate}
                          </span>
                          <span className="text-muted-foreground">
                            {booking.selectedTime}〜
                          </span>
                        </div>
                        {booking.optionsSummary.length > 0 && (
                          <div className="ml-6">
                            <p className="text-muted-foreground mb-1">
                              オプション:
                            </p>
                            <ul className="space-y-1">
                              {booking.optionsSummary.map((option, idx) => (
                                <li key={idx} className="text-xs">
                                  • {option}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {booking.status === "pending" && (
                        <>
                          <Button size="sm" className="btn-primary">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            承認する
                          </Button>
                          <Button size="sm" variant="outline">
                            日時変更を提案
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost">
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminDashboard;
