 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Separator } from "@/components/ui/separator";
 import { Icon } from "@/components/ui/icon";
 import { Booking } from "@/types/booking";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface AdditionalCharge {
   title: string;
   amount: number;
 }
 
 interface WorkCompletionModalProps {
   booking: Booking | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess?: () => void;
 }
 
 const PRESET_CHARGES = [
   { title: "駐車場代", amount: 1000 },
   { title: "追加作業", amount: 2000 },
   { title: "出張費", amount: 3000 },
   { title: "部品代", amount: 5000 },
 ];
 
 export const WorkCompletionModal = ({
   booking,
   open,
   onOpenChange,
   onSuccess,
 }: WorkCompletionModalProps) => {
   const [finalAmount, setFinalAmount] = useState<number>(0);
   const [paymentMethod, setPaymentMethod] = useState<string>("cash");
   const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
   const [customChargeTitle, setCustomChargeTitle] = useState("");
   const [customChargeAmount, setCustomChargeAmount] = useState<number>(0);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   // Initialize with booking total price when modal opens
   useState(() => {
     if (booking) {
       setFinalAmount(booking.totalPrice);
     }
   });
 
   if (!booking) return null;
 
   const totalAdditionalCharges = additionalCharges.reduce((sum, c) => sum + c.amount, 0);
   const calculatedTotal = (booking.totalPrice || 0) + totalAdditionalCharges;
 
   const handleAddPresetCharge = (preset: { title: string; amount: number }) => {
     const existing = additionalCharges.find(c => c.title === preset.title);
     if (!existing) {
       setAdditionalCharges([...additionalCharges, preset]);
     }
   };
 
   const handleAddCustomCharge = () => {
     if (customChargeTitle && customChargeAmount > 0) {
       setAdditionalCharges([...additionalCharges, { title: customChargeTitle, amount: customChargeAmount }]);
       setCustomChargeTitle("");
       setCustomChargeAmount(0);
     }
   };
 
   const handleRemoveCharge = (index: number) => {
     setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
   };
 
   const handleSubmit = async () => {
     setIsSubmitting(true);
     try {
       const finalTotal = finalAmount || calculatedTotal;
 
      // Update booking with completion data (GMVは予約確定時に計上済み)
       const { error: bookingError } = await supabase
         .from("bookings")
         .update({
           status: "completed",
           final_amount: finalTotal,
           payment_method: paymentMethod,
          additional_charges: additionalCharges as unknown as { title: string; amount: number }[],
           collected_at: paymentMethod !== "online_card" ? new Date().toISOString() : null,
           updated_at: new Date().toISOString(),
         })
         .eq("id", booking.id);
 
       if (bookingError) throw bookingError;
 
       // Get organization_id for audit log
       const { data: bookingData } = await supabase
         .from("bookings")
        .select("organization_id, gmv_included_at")
         .eq("id", booking.id)
         .single();
 
       // Insert audit log
       const { data: userData } = await supabase.auth.getUser();
       
       await supabase.from("gmv_audit_log").insert({
         organization_id: bookingData?.organization_id,
         booking_id: booking.id,
        action: bookingData?.gmv_included_at ? "modified" : "completed",
         previous_amount: booking.totalPrice,
         new_amount: finalTotal,
         reason: additionalCharges.length > 0 
          ? `作業完了・追加料金: ${additionalCharges.map(c => c.title).join(", ")}`
          : "作業完了",
         performed_by: userData?.user?.id,
       });
 
       toast.success("作業完了を記録しました", {
         description: `売上金額: ¥${finalTotal.toLocaleString()}`
       });
       onSuccess?.();
       onOpenChange(false);
     } catch (error) {
       console.error("Work completion error:", error);
       toast.error("作業完了の記録に失敗しました");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const getPaymentMethodLabel = (method: string) => {
     switch (method) {
       case "cash": return "現金";
       case "bank_transfer": return "振込";
       case "online_card": return "カード決済";
       case "other": return "その他";
       default: return method;
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Icon name="check_circle" size={24} className="text-success" />
             作業完了
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-6 py-4">
           {/* Base Amount Display */}
           <div className="bg-muted/50 p-4 rounded-lg">
             <div className="flex justify-between items-center">
               <span className="text-sm text-muted-foreground">見積金額</span>
               <span className="font-medium">¥{booking.totalPrice.toLocaleString()}</span>
             </div>
           </div>
 
           {/* Additional Charges */}
           <div className="space-y-3">
             <Label className="text-sm font-medium">追加料金</Label>
             
             {/* Preset buttons */}
             <div className="flex flex-wrap gap-2">
               {PRESET_CHARGES.map((preset) => (
                 <Button
                   key={preset.title}
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => handleAddPresetCharge(preset)}
                   disabled={additionalCharges.some(c => c.title === preset.title)}
                 >
                   + {preset.title}
                 </Button>
               ))}
             </div>
 
             {/* Custom charge input */}
             <div className="flex gap-2">
               <Input
                 placeholder="項目名"
                 value={customChargeTitle}
                 onChange={(e) => setCustomChargeTitle(e.target.value)}
                 className="flex-1"
               />
               <Input
                 type="number"
                 placeholder="金額"
                 value={customChargeAmount || ""}
                 onChange={(e) => setCustomChargeAmount(Number(e.target.value))}
                 className="w-24"
               />
               <Button
                 type="button"
                 variant="outline"
                 size="icon"
                 onClick={handleAddCustomCharge}
                 disabled={!customChargeTitle || customChargeAmount <= 0}
               >
                 <Icon name="add" size={18} />
               </Button>
             </div>
 
             {/* Added charges list */}
             {additionalCharges.length > 0 && (
               <div className="space-y-2 mt-2">
                 {additionalCharges.map((charge, index) => (
                   <div key={index} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded">
                     <span className="text-sm">{charge.title}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-medium">¥{charge.amount.toLocaleString()}</span>
                       <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         className="h-6 w-6"
                         onClick={() => handleRemoveCharge(index)}
                       >
                         <Icon name="close" size={14} />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
 
           <Separator />
 
           {/* Final Amount */}
           <div className="space-y-2">
             <Label className="text-sm font-medium">最終金額</Label>
             <div className="flex items-center gap-2">
               <span className="text-lg">¥</span>
               <Input
                 type="number"
                 value={finalAmount || calculatedTotal}
                 onChange={(e) => setFinalAmount(Number(e.target.value))}
                 className="text-xl font-bold"
               />
             </div>
             {totalAdditionalCharges > 0 && (
               <p className="text-xs text-muted-foreground">
                 見積 ¥{booking.totalPrice.toLocaleString()} + 追加 ¥{totalAdditionalCharges.toLocaleString()} = ¥{calculatedTotal.toLocaleString()}
               </p>
             )}
           </div>
 
           <Separator />
 
           {/* Payment Method */}
           <div className="space-y-3">
             <Label className="text-sm font-medium">決済方法</Label>
             <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
               <div className="grid grid-cols-2 gap-2">
                 {["cash", "bank_transfer", "online_card", "other"].map((method) => (
                   <div key={method} className="flex items-center space-x-2">
                     <RadioGroupItem value={method} id={method} />
                     <Label htmlFor={method} className="cursor-pointer">
                       {getPaymentMethodLabel(method)}
                     </Label>
                   </div>
                 ))}
               </div>
             </RadioGroup>
           </div>
 
           {/* Actions */}
           <div className="flex gap-3 pt-4">
             <Button
               variant="outline"
               className="flex-1"
               onClick={() => onOpenChange(false)}
             >
               キャンセル
             </Button>
             <Button
               className="flex-1 bg-success hover:bg-success/90"
               onClick={handleSubmit}
               disabled={isSubmitting}
             >
               {isSubmitting ? (
                 <Icon name="sync" size={18} className="mr-2 animate-spin" />
               ) : (
                 <Icon name="check" size={18} className="mr-2" />
               )}
               作業完了を確定
             </Button>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 };