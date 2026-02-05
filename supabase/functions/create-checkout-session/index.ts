 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface CheckoutRequest {
   bookingId: string;
 }
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { bookingId }: CheckoutRequest = await req.json();
 
     if (!bookingId) {
       return new Response(
         JSON.stringify({ error: "bookingId is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[create-checkout-session] Creating session for booking: ${bookingId}`);
 
     // Initialize Supabase client with service role
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Fetch booking with organization
     const { data: booking, error: bookingError } = await supabase
       .from("bookings")
       .select(`
         id,
         customer_name,
         customer_email,
         customer_phone,
         customer_id,
         selected_date,
         selected_time,
         total_price,
         status,
         organization_id,
         organizations (
           name,
           stripe_account_id,
           stripe_account_status,
           payment_enabled,
           checkout_expiry_hours,
           platform_fee_percent
         )
       `)
       .eq("id", bookingId)
       .single();
 
     if (bookingError || !booking) {
       console.error("[create-checkout-session] Booking not found:", bookingError);
       return new Response(
         JSON.stringify({ error: "Booking not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Validate booking status
     if (booking.status !== "pending" && booking.status !== "confirmed") {
       return new Response(
         JSON.stringify({ error: "Booking is not in a valid state for payment" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const org = booking.organizations as any;
     
     // Check if payment is enabled for org
     if (!org?.payment_enabled) {
       return new Response(
         JSON.stringify({ error: "Payment is not enabled for this organization" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Recalculate total server-side for security
     const { data: bookingServices } = await supabase
       .from("booking_services")
       .select("service_base_price, service_quantity")
       .eq("booking_id", bookingId);
 
     const { data: bookingOptions } = await supabase
       .from("booking_options")
       .select("option_price, option_quantity")
       .eq("booking_id", bookingId);
 
     let calculatedTotal = 0;
     
     // Calculate services total
     if (bookingServices) {
       calculatedTotal += bookingServices.reduce((sum, s) => 
         sum + (s.service_base_price * s.service_quantity), 0);
     }
     
     // Calculate options total
     if (bookingOptions) {
       calculatedTotal += bookingOptions.reduce((sum, o) => 
         sum + (o.option_price * o.option_quantity), 0);
     }
 
     // If calculated total differs from stored, use the calculated one
     const finalTotal = calculatedTotal > 0 ? calculatedTotal : booking.total_price;
 
     console.log(`[create-checkout-session] Total: stored=${booking.total_price}, calculated=${calculatedTotal}, final=${finalTotal}`);
 
     // Initialize Stripe
     const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeSecretKey) {
       return new Response(
         JSON.stringify({ error: "Stripe is not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const stripe = new Stripe(stripeSecretKey, {
       apiVersion: "2023-10-16",
     });
 
     // Build success/cancel URLs
     const baseUrl = Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app";
     const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
     const cancelUrl = `${baseUrl}/payment/cancelled?booking_id=${bookingId}`;
 
     // Calculate platform fee (7% as specified)
     const platformFeePercent = org.platform_fee_percent || 7;
     const platformFeeAmount = Math.round(finalTotal * (platformFeePercent / 100));
 
     // Fetch service names for line items
     const { data: services } = await supabase
       .from("booking_services")
       .select("service_title, service_quantity")
       .eq("booking_id", bookingId);
 
     const serviceDescription = services?.map(s => 
       `${s.service_title}${s.service_quantity > 1 ? ` x${s.service_quantity}` : ''}`
     ).join(', ') || '予約サービス';
 
     // Calculate expiry (72 hours as specified)
     const expiryHours = org.checkout_expiry_hours || 72;
     const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
 
     // Create Stripe Checkout Session
     const sessionParams: Stripe.Checkout.SessionCreateParams = {
       payment_method_types: ["card"],
       mode: "payment",
       line_items: [
         {
           price_data: {
             currency: "jpy",
             product_data: {
               name: serviceDescription,
               description: `予約日: ${booking.selected_date} ${booking.selected_time}`,
             },
             unit_amount: finalTotal,
           },
           quantity: 1,
         },
       ],
       success_url: successUrl,
       cancel_url: cancelUrl,
       customer_email: booking.customer_email || undefined,
       metadata: {
         booking_id: bookingId,
         organization_id: booking.organization_id,
       },
       expires_at: Math.floor(expiresAt.getTime() / 1000),
       payment_intent_data: {
         metadata: {
           booking_id: bookingId,
           organization_id: booking.organization_id,
         },
         receipt_email: booking.customer_email || undefined,
       },
     };
 
     // If using Stripe Connect, add transfer data
     if (org.stripe_account_id && org.stripe_account_status === "active") {
       sessionParams.payment_intent_data!.application_fee_amount = platformFeeAmount;
       sessionParams.payment_intent_data!.transfer_data = {
         destination: org.stripe_account_id,
       };
     }
 
     const session = await stripe.checkout.sessions.create(sessionParams);
 
     console.log(`[create-checkout-session] Session created: ${session.id}`);
 
     // Update booking with checkout session info
     const { error: updateError } = await supabase
       .from("bookings")
       .update({
         stripe_checkout_session_id: session.id,
         checkout_expires_at: expiresAt.toISOString(),
         payment_status: "awaiting_payment",
         status: "awaiting_payment",
         updated_at: new Date().toISOString(),
       })
       .eq("id", bookingId);
 
     if (updateError) {
       console.error("[create-checkout-session] Failed to update booking:", updateError);
     }
 
     // Send payment link to customer via hybrid notification
     try {
       await supabase.functions.invoke("send-hybrid-notification", {
         body: {
           bookingId,
           notificationType: "payment_request",
           checkoutUrl: session.url,
           expiresAt: expiresAt.toISOString(),
         },
       });
     } catch (notifyError) {
       console.error("[create-checkout-session] Notification failed:", notifyError);
       // Don't fail the whole request if notification fails
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         sessionId: session.id,
         checkoutUrl: session.url,
         expiresAt: expiresAt.toISOString(),
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error: any) {
     console.error("[create-checkout-session] Error:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });