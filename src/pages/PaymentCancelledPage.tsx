 import { useSearchParams, useNavigate } from "react-router-dom";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Icon } from "@/components/ui/icon";
 
 export default function PaymentCancelledPage() {
   const [searchParams] = useSearchParams();
   const navigate = useNavigate();
   const bookingId = searchParams.get("booking_id");
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
       <Card className="max-w-md w-full text-center">
         <CardHeader>
           <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-4">
             <Icon name="cancel" size={40} className="text-warning" />
           </div>
           <CardTitle className="text-2xl">お支払いがキャンセルされました</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <p className="text-muted-foreground">
             お支払い手続きが完了しませんでした。<br />
             再度お支払いを行う場合は、メールまたはLINEでお送りしたリンクから再度お手続きください。
           </p>
 
           <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
             <p>決済リンクの有効期限が切れている場合は、店舗にお問い合わせください。</p>
           </div>
 
           <Button onClick={() => navigate("/")} variant="outline" className="w-full">
             トップページへ戻る
           </Button>
         </CardContent>
       </Card>
     </div>
   );
 }