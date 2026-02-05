 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
     apiVersion: "2025-08-27.basil",
   });
 
   const supabase = createClient(
     Deno.env.get("SUPABASE_URL") ?? "",
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
   );
 
   try {
     const signature = req.headers.get("stripe-signature");
     if (!signature) {
       console.error("No stripe signature found");
       return new Response(JSON.stringify({ error: "No signature" }), {
         status: 400,
         headers: corsHeaders,
       });
     }
 
     const body = await req.text();
     const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
 
     if (!webhookSecret) {
       console.error("STRIPE_WEBHOOK_SECRET not configured");
       return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
         status: 500,
         headers: corsHeaders,
       });
     }
 
     let event: Stripe.Event;
     try {
       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
     } catch (err: any) {
       console.error("Webhook signature verification failed:", err.message);
       return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
         status: 400,
         headers: corsHeaders,
       });
     }
 
     console.log(`Processing platform webhook event: ${event.type} (${event.id})`);
 
     // Check for duplicate events
     const { data: existingEvent } = await supabase
       .from("stripe_webhook_events")
       .select("id")
       .eq("stripe_event_id", event.id)
       .single();
 
     if (existingEvent) {
       console.log(`Duplicate event ${event.id}, skipping`);
       return new Response(JSON.stringify({ received: true, duplicate: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Handle invoice events
     switch (event.type) {
       case "invoice.paid": {
         const invoice = event.data.object as Stripe.Invoice;
         const organizationId = invoice.metadata?.organization_id;
         const billingMonth = invoice.metadata?.billing_month;
 
         console.log(`Invoice paid: ${invoice.id} for org ${organizationId}, month ${billingMonth}`);
 
         if (organizationId && billingMonth) {
           const { error } = await supabase
             .from("monthly_billing")
             .update({
               invoice_status: "paid",
               paid_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
             })
             .eq("organization_id", organizationId)
             .eq("billing_month", billingMonth);
 
           if (error) {
             console.error("Error updating billing status:", error);
           } else {
             console.log(`Updated billing status to paid for ${organizationId}/${billingMonth}`);
           }
         }
         break;
       }
 
       case "invoice.payment_failed": {
         const invoice = event.data.object as Stripe.Invoice;
         const organizationId = invoice.metadata?.organization_id;
         const billingMonth = invoice.metadata?.billing_month;
 
         console.log(`Invoice payment failed: ${invoice.id} for org ${organizationId}`);
 
         if (organizationId && billingMonth) {
           const { error } = await supabase
             .from("monthly_billing")
             .update({
               invoice_status: "overdue",
               updated_at: new Date().toISOString(),
             })
             .eq("organization_id", organizationId)
             .eq("billing_month", billingMonth);
 
           if (error) {
             console.error("Error updating billing status:", error);
           }
         }
         break;
       }
 
       case "invoice.voided": {
         const invoice = event.data.object as Stripe.Invoice;
         const organizationId = invoice.metadata?.organization_id;
         const billingMonth = invoice.metadata?.billing_month;
 
         if (organizationId && billingMonth) {
           await supabase
             .from("monthly_billing")
             .update({
               invoice_status: "void",
               updated_at: new Date().toISOString(),
             })
             .eq("organization_id", organizationId)
             .eq("billing_month", billingMonth);
         }
         break;
       }
 
       default:
         console.log(`Unhandled event type: ${event.type}`);
     }
 
     // Record event for idempotency
     await supabase.from("stripe_webhook_events").insert({
       stripe_event_id: event.id,
       event_type: event.type,
       payload: event.data.object as any,
       organization_id: (event.data.object as any).metadata?.organization_id || null,
     });
 
     return new Response(JSON.stringify({ received: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error: any) {
     console.error("Platform webhook error:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });