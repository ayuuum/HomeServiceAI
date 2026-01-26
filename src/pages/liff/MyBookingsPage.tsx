import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import liff from "@line/liff";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface Booking {
    id: string;
    selected_date: string;
    selected_time: string;
    status: string;
    total_price: number;
    customer_name: string;
    service_titles: string[];
}

const MyBookingsPage = () => {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<any>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [lineUserId, setLineUserId] = useState<string | null>(null);

    useEffect(() => {
        const initPage = async () => {
            if (!orgSlug) return;

            try {
                // Fetch organization info to get LIFF ID
                const { data: orgData, error: orgError } = await supabase
                    .rpc('get_organization_public', { org_slug: orgSlug });

                if (orgError || !orgData || orgData.length === 0) {
                    toast.error("組織情報が見つかりません");
                    setLoading(false);
                    return;
                }

                const org = orgData[0];
                setOrganization(org);

                // Since line_liff_id might not be in the RPC result, we'll try LIFF init anyway
                // or use a hardcoded LIFF ID for now
                const liffId = (org as any).line_liff_id;
                
                if (liffId) {
                    await liff.init({ liffId });
                    if (!liff.isLoggedIn()) {
                        liff.login();
                        return;
                    }
                    const profile = await liff.getProfile();
                    setLineUserId(profile.userId);

                    // Fetch bookings using direct query with customer lookup
                    const { data: customers } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('line_user_id', profile.userId)
                        .eq('organization_id', org.id)
                        .single();

                    if (customers) {
                        const { data: bookingData, error: bookingError } = await supabase
                            .from('bookings')
                            .select(`
                                id,
                                selected_date,
                                selected_time,
                                status,
                                total_price,
                                customer_name,
                                booking_services (service_title)
                            `)
                            .eq('customer_id', customers.id)
                            .eq('organization_id', org.id)
                            .order('selected_date', { ascending: false });

                        if (bookingError) {
                            console.error("Failed to fetch bookings:", bookingError);
                            toast.error("予約情報の取得に失敗しました");
                        } else {
                            const formattedBookings = (bookingData || []).map(b => ({
                                id: b.id,
                                selected_date: b.selected_date,
                                selected_time: b.selected_time,
                                status: b.status,
                                total_price: b.total_price,
                                customer_name: b.customer_name,
                                service_titles: (b.booking_services || []).map((s: any) => s.service_title)
                            }));
                            setBookings(formattedBookings);
                        }
                    }
                } else {
                    toast.error("LINE連携が設定されていません");
                }
            } catch (err) {
                console.error("Initialization failed:", err);
                toast.error("初期化に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        initPage();
    }, [orgSlug]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">予約中</span>;
            case 'confirmed': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">確定</span>;
            case 'completed': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">完了</span>;
            case 'cancelled': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">キャンセル</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Icon name="sync" className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="container max-w-md mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-4">
                {organization?.logo_url && (
                    <img src={organization.logo_url} alt={organization.name} className="w-12 h-12 rounded-full object-cover" />
                )}
                <div>
                    <h1 className="text-xl font-bold">{organization?.name}</h1>
                    <p className="text-sm text-muted-foreground">予約履歴・マイページ</p>
                </div>
            </div>

            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <Icon name="calendar" className="mx-auto mb-4 text-muted-foreground" size={48} />
                            <p className="text-muted-foreground">予約履歴が見つかりませんでした。</p>
                            <Button onClick={() => navigate(`/booking/${orgSlug}`)} className="mt-4">
                                新しく予約する
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {format(new Date(booking.selected_date), "M月d日(E)", { locale: ja })}
                                        </CardTitle>
                                        <CardDescription>{booking.selected_time}〜</CardDescription>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">メニュー</span>
                                        <span className="font-medium text-right">{booking.service_titles.join(", ")}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">お支払い予定額</span>
                                        <span className="font-bold">¥{booking.total_price.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => navigate(`/booking/${orgSlug}`)}
                                    >
                                        再予約
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={() => {
                                            // We don't have token here yet, would need to fetch it or update RPC
                                            toast.info("詳細確認は現在開発中です");
                                        }}
                                    >
                                        詳細を確認
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {organization?.name}
            </div>
        </div>
    );
};

export default MyBookingsPage;
