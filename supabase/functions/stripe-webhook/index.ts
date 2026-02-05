 // =====================================================
 // Stripe Webhook Handler for Organization Online Payments
 // This handles webhooks from organizations' own Stripe accounts
 // for online payments made by customers.
 // =====================================================
 
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, stripe-signature",
 };
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Note: In the GMV model, organizations have their own Stripe accounts.
     // This webhook would be configured by each organization pointing to this endpoint.
     // For now, we use the platform's Stripe key to verify signatures.
     const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
     const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
 
     if (!stripeSecretKey) {
       console.error("[stripe-webhook] STRIPE_SECRET_KEY not configured");
       return new Response(
         JSON.stringify({ error: "Stripe not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
 
     // Get the raw body for signature verification
     const body = await req.text();
     const signature = req.headers.get("stripe-signature");
 
     let event: Stripe.Event;
 
     // Verify webhook signature if secret is configured
     if (webhookSecret && signature) {
       try {
         event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
       } catch (err: any) {
         console.error("[stripe-webhook] Signature verification failed:", err.message);
         return new Response(
           JSON.stringify({ error: "Invalid signature" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
     } else {
       // For development without webhook secret
       event = JSON.parse(body);
       console.warn("[stripe-webhook] Processing without signature verification");
     }
 
     console.log(`[stripe-webhook] Processing event: ${event.type} (${event.id})`);
 
     // Initialize Supabase
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Check for duplicate event (idempotency)
     const { data: existingEvent } = await supabase
       .from("stripe_webhook_events")
       .select("id")
       .eq("stripe_event_id", event.id)
       .maybeSingle();
 
     if (existingEvent) {
       console.log(`[stripe-webhook] Duplicate event ${event.id}, skipping`);
       return new Response(
         JSON.stringify({ received: true, duplicate: true }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Process based on event type
     // In the GMV model, these events come from organization's Stripe accounts
     // for online payments made by customers
     switch (event.type) {
       case "checkout.session.completed": {
         const session = event.data.object as Stripe.Checkout.Session;
         await handleCheckoutCompleted(supabase, session);
         break;
       }
 
       case "checkout.session.expired": {
         const session = event.data.object as Stripe.Checkout.Session;
         await handleCheckoutExpired(supabase, session);
         break;
       }
 
       case "charge.refunded": {
         const charge = event.data.object as Stripe.Charge;
         await handleChargeRefunded(supabase, charge);
         break;
       }
 
       case "payment_intent.payment_failed": {
         const paymentIntent = event.data.object as Stripe.PaymentIntent;
         await handlePaymentFailed(supabase, paymentIntent);
         break;
       }
 
       default:
         console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
     }
 
     // Record the event for idempotency
     const metadata = (event.data.object as any)?.metadata;
     await supabase.from("stripe_webhook_events").insert({
       stripe_event_id: event.id,
       event_type: event.type,
       payload: event.data.object,
       organization_id: metadata?.organization_id || null,
     });
 
     return new Response(
       JSON.stringify({ received: true }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error: any) {
     console.error("[stripe-webhook] Error:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });
 
 async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
   const bookingId = session.metadata?.booking_id;
   if (!bookingId) {
     console.error("[stripe-webhook] No booking_id in session metadata");
     return;
   }
 
   console.log(`[stripe-webhook] Online payment completed for booking: ${bookingId}`);
 
   // Update booking - mark online payment as completed
   // Note: In GMV model, this doesn't complete the booking.
   // The booking is completed when the admin records "work completion"
   const { error } = await supabase
     .from("bookings")
     .update({
       online_payment_status: "paid",
       payment_method: "online_card",
       stripe_payment_intent_id: session.payment_intent,
       paid_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     })
     .eq("id", bookingId);
 
   if (error) {
     console.error("[stripe-webhook] Failed to update booking:", error);
     return;
   }
 
   // Create notification for admin
   const { data: booking } = await supabase
     .from("bookings")
     .select("organization_id, customer_name")
     .eq("id", bookingId)
     .single();
 
   if (booking) {
     await supabase.from("notifications").insert({
       organization_id: booking.organization_id,
       type: "payment_completed",
       title: "オンライン決済完了",
       message: `${booking.customer_name}様がカード決済を完了しました`,
       resource_type: "booking",
       resource_id: bookingId,
     });
   }
 
   console.log(`[stripe-webhook] Booking ${bookingId} online payment marked as paid`);
 }
 
 async function handleCheckoutExpired(supabase: any, session: Stripe.Checkout.Session) {
   const bookingId = session.metadata?.booking_id;
   if (!bookingId) {
     console.error("[stripe-webhook] No booking_id in session metadata");
     return;
   }
 
   console.log(`[stripe-webhook] Checkout expired for booking: ${bookingId}`);
 
   // Update booking online payment status
   const { error } = await supabase
     .from("bookings")
     .update({
       online_payment_status: "expired",
       updated_at: new Date().toISOString(),
     })
     .eq("id", bookingId);
 
   if (error) {
     console.error("[stripe-webhook] Failed to update booking:", error);
     return;
   }
 
   console.log(`[stripe-webhook] Booking ${bookingId} online payment marked as expired`);
 }
 
 async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
   const paymentIntentId = charge.payment_intent as string;
   if (!paymentIntentId) {
     console.error("[stripe-webhook] No payment_intent in charge");
     return;
   }
 
   console.log(`[stripe-webhook] Charge refunded for payment_intent: ${paymentIntentId}`);
 
   // Find booking by payment intent ID
   const { data: booking, error: findError } = await supabase
     .from("bookings")
     .select("id, organization_id, final_amount")
     .eq("stripe_payment_intent_id", paymentIntentId)
     .maybeSingle();
 
   if (findError || !booking) {
     console.error("[stripe-webhook] Booking not found for payment_intent:", paymentIntentId);
     return;
   }
 
   // Update online payment status to refunded
   const { error } = await supabase
     .from("bookings")
     .update({
       online_payment_status: "refunded",
       refund_amount: charge.amount_refunded,
       refunded_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     })
     .eq("id", booking.id);
 
   if (error) {
     console.error("[stripe-webhook] Failed to update booking:", error);
     return;
   }
 
   // Log to audit if GMV was already recorded
   if (booking.final_amount) {
     await supabase.from("gmv_audit_log").insert({
       organization_id: booking.organization_id,
       booking_id: booking.id,
       action: "refunded",
       previous_amount: booking.final_amount,
       new_amount: booking.final_amount - charge.amount_refunded,
       reason: "Online payment refunded via Stripe",
     });
   }
 
   console.log(`[stripe-webhook] Booking ${booking.id} online payment marked as refunded`);
 }
 
 async function handlePaymentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
   const bookingId = paymentIntent.metadata?.booking_id;
   if (!bookingId) {
     console.error("[stripe-webhook] No booking_id in payment_intent metadata");
     return;
   }
 
   console.log(`[stripe-webhook] Payment failed for booking: ${bookingId}`);
 
   // Update booking online payment status
   const { error } = await supabase
     .from("bookings")
     .update({
       online_payment_status: "failed",
       updated_at: new Date().toISOString(),
     })
     .eq("id", bookingId);
 
   if (error) {
     console.error("[stripe-webhook] Failed to update booking:", error);
   }
 }