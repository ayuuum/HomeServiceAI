 import { useEffect, useState } from "react";
 import { useSearchParams, useNavigate } from "react-router-dom";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Icon } from "@/components/ui/icon";
 import { supabase } from "@/integrations/supabase/client";
 
 export default function PaymentSuccessPage() {
   const [searchParams] = useSearchParams();
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [booking, setBooking] = useState<any>(null);
   const sessionId = searchParams.get("session_id");
 
   useEffect(() => {
     const fetchBookingBySession = async () => {
       if (!sessionId) {
         setLoading(false);
         return;
       }
 
       try {
         const { data, error } = await supabase
           .from("bookings")
           .select("id, customer_name, selected_date, selected_time, total_price, status")
           .eq("stripe_checkout_session_id", sessionId)
           .maybeSingle();
 
         if (!error && data) {
           setBooking(data);
         }
       } catch (err) {
         console.error("Failed to fetch booking:", err);
       } finally {
         setLoading(false);
       }
     };
 
     fetchBookingBySession();
   }, [sessionId]);
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
       <Card className="max-w-md w-full text-center">
         <CardHeader>
           <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
             <Icon name="check_circle" size={40} className="text-success" />
           </div>
           <CardTitle className="text-2xl">お支払い完了</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <p className="text-muted-foreground">
             お支払いが正常に完了しました。<br />
             ご予約が確定されました。
           </p>
 
           {loading ? (
             <div className="py-4 text-muted-foreground">読み込み中...</div>
           ) : booking ? (
             <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">お名前:</span>
                 <span className="font-medium">{booking.customer_name}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">日時:</span>
                 <span className="font-medium">{booking.selected_date} {booking.selected_time}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">金額:</span>
                 <span className="font-medium">¥{booking.total_price?.toLocaleString()}</span>
               </div>
             </div>
           ) : null}
 
           <p className="text-sm text-muted-foreground">
             確認メールをお送りしましたのでご確認ください。
           </p>
 
           <Button onClick={() => navigate("/")} className="w-full">
             トップページへ戻る
           </Button>
         </CardContent>
       </Card>
     </div>
   );
 }