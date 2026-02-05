 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface RefundRequest {
   bookingId: string;
   amount?: number; // Optional: partial refund amount. If not provided, full refund.
   reason?: string;
 }
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Verify authentication
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const { bookingId, amount, reason }: RefundRequest = await req.json();
 
     if (!bookingId) {
       return new Response(
         JSON.stringify({ error: "bookingId is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[create-refund] Creating refund for booking: ${bookingId}`);
 
     // Initialize Supabase with auth context
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     // Verify user authentication
     const { data: { user }, error: authError } = await supabase.auth.getUser();
     if (authError || !user) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Fetch booking (RLS will ensure user has access)
     const { data: booking, error: bookingError } = await supabase
       .from("bookings")
       .select("id, stripe_payment_intent_id, payment_status, total_price, organization_id")
       .eq("id", bookingId)
       .single();
 
     if (bookingError || !booking) {
       console.error("[create-refund] Booking not found:", bookingError);
       return new Response(
         JSON.stringify({ error: "Booking not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if booking has a payment intent
     if (!booking.stripe_payment_intent_id) {
       return new Response(
         JSON.stringify({ error: "No payment found for this booking" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if already refunded
     if (booking.payment_status === "refunded") {
       return new Response(
         JSON.stringify({ error: "Booking has already been refunded" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Initialize Stripe
     const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeSecretKey) {
       return new Response(
         JSON.stringify({ error: "Stripe is not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
 
     // Create refund
     const refundParams: Stripe.RefundCreateParams = {
       payment_intent: booking.stripe_payment_intent_id,
       reason: "requested_by_customer",
     };
 
     // If partial refund, specify amount
     if (amount && amount > 0 && amount < booking.total_price) {
       refundParams.amount = amount;
     }
 
     const refund = await stripe.refunds.create(refundParams);
 
     console.log(`[create-refund] Refund created: ${refund.id}, amount: ${refund.amount}`);
 
     // Update booking status
     const isFullRefund = !amount || amount >= booking.total_price;
     const newPaymentStatus = isFullRefund ? "refunded" : "partially_refunded";
 
     const { error: updateError } = await supabase
       .from("bookings")
       .update({
         payment_status: newPaymentStatus,
         refund_amount: refund.amount,
         refunded_at: new Date().toISOString(),
         status: isFullRefund ? "cancelled" : booking.payment_status,
         cancelled_at: isFullRefund ? new Date().toISOString() : null,
         cancelled_by: isFullRefund ? "admin" : null,
         updated_at: new Date().toISOString(),
       })
       .eq("id", bookingId);
 
     if (updateError) {
       console.error("[create-refund] Failed to update booking:", updateError);
     }
 
     // Send notification to customer
     try {
       const supabaseService = createClient(
         supabaseUrl,
         Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
       );
 
       await supabaseService.functions.invoke("send-hybrid-notification", {
         body: {
           bookingId,
           notificationType: "refund_completed",
           refundAmount: refund.amount,
         },
       });
     } catch (notifyError) {
       console.error("[create-refund] Notification failed:", notifyError);
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         refundId: refund.id,
         amount: refund.amount,
         status: refund.status,
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error: any) {
     console.error("[create-refund] Error:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });