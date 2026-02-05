 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req: Request): Promise<Response> => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     console.log("[cron-payment-check] Starting payment check...");
 
     // Initialize Supabase client
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const now = new Date();
     const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
     
     // Task 1: Send reminders for bookings expiring within 12 hours
     // Find bookings where:
     // - status = 'awaiting_payment'
     // - payment_status = 'unpaid'
     // - checkout_expires_at is within 12 hours
     // - payment_reminder_sent_at is NULL (not already sent)
     const { data: reminderBookings, error: reminderError } = await supabase
       .from('bookings')
       .select(`
         id,
         customer_name,
         customer_email,
         customer_id,
         selected_date,
         selected_time,
         total_price,
         checkout_expires_at,
         stripe_checkout_session_id,
         organization_id,
         customers (
           line_user_id
         ),
         organizations (
           line_channel_token,
           payment_enabled
         )
       `)
       .eq('status', 'awaiting_payment')
       .eq('payment_status', 'unpaid')
       .is('payment_reminder_sent_at', null)
       .not('checkout_expires_at', 'is', null)
       .lte('checkout_expires_at', twelveHoursFromNow.toISOString())
       .gt('checkout_expires_at', now.toISOString());
 
     if (reminderError) {
       console.error("[cron-payment-check] Error fetching reminder bookings:", reminderError);
     } else {
       console.log(`[cron-payment-check] Found ${reminderBookings?.length || 0} bookings needing payment reminder`);
       
       for (const booking of reminderBookings || []) {
         try {
           const org = booking.organizations as any;
           if (!org?.payment_enabled) {
             console.log(`[cron-payment-check] Skipping booking ${booking.id} - payment not enabled for org`);
             continue;
           }
 
           // Get checkout URL from Stripe session
           let checkoutUrl = '';
           if (booking.stripe_checkout_session_id) {
             // Construct the checkout URL (Stripe sessions can be retrieved to get the URL)
             // For now, we'll need to generate a new checkout session URL or use stored one
             // The checkout URL was sent initially, customer should use that
             // We can reconstruct it or ask them to contact support
             console.log(`[cron-payment-check] Sending payment reminder for booking ${booking.id}`);
           }
 
           // Send payment reminder notification
           const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/send-hybrid-notification`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${supabaseServiceKey}`,
             },
             body: JSON.stringify({
               bookingId: booking.id,
               notificationType: 'payment_reminder',
               checkoutUrl: checkoutUrl,
             }),
           });
 
           if (!notifyResponse.ok) {
             console.error(`[cron-payment-check] Failed to send reminder for booking ${booking.id}:`, await notifyResponse.text());
           } else {
             // Update payment_reminder_sent_at
             await supabase
               .from('bookings')
               .update({ payment_reminder_sent_at: now.toISOString() })
               .eq('id', booking.id);
             
             console.log(`[cron-payment-check] Payment reminder sent for booking ${booking.id}`);
           }
         } catch (err) {
           console.error(`[cron-payment-check] Error processing reminder for booking ${booking.id}:`, err);
         }
       }
     }
 
     // Task 2: Mark expired payment links
     // Find bookings where:
     // - status = 'awaiting_payment'
     // - payment_status = 'unpaid'
     // - checkout_expires_at has passed
     const { data: expiredBookings, error: expiredError } = await supabase
       .from('bookings')
       .select(`
         id,
         customer_name,
         organization_id,
         organizations (
           payment_enabled
         )
       `)
       .eq('status', 'awaiting_payment')
       .eq('payment_status', 'unpaid')
       .not('checkout_expires_at', 'is', null)
       .lt('checkout_expires_at', now.toISOString());
 
     if (expiredError) {
       console.error("[cron-payment-check] Error fetching expired bookings:", expiredError);
     } else {
       console.log(`[cron-payment-check] Found ${expiredBookings?.length || 0} expired payment bookings`);
       
       for (const booking of expiredBookings || []) {
         try {
           const org = booking.organizations as any;
           if (!org?.payment_enabled) {
             continue;
           }
 
           // Update payment_status to 'expired'
           await supabase
             .from('bookings')
             .update({ payment_status: 'expired' })
             .eq('id', booking.id);
 
           // Send payment expired notification to customer
           const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/send-hybrid-notification`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${supabaseServiceKey}`,
             },
             body: JSON.stringify({
               bookingId: booking.id,
               notificationType: 'payment_expired',
             }),
           });
 
           if (!notifyResponse.ok) {
             console.error(`[cron-payment-check] Failed to send expiry notification for booking ${booking.id}:`, await notifyResponse.text());
           } else {
             console.log(`[cron-payment-check] Payment expired notification sent for booking ${booking.id}`);
           }
 
           // Create admin notification
           await supabase.from('notifications').insert({
             organization_id: booking.organization_id,
             type: 'payment_expired',
             title: '決済期限切れ',
             message: `${booking.customer_name}様の決済リンクが期限切れになりました。対応をご確認ください。`,
             resource_type: 'booking',
             resource_id: booking.id,
           });
 
         } catch (err) {
           console.error(`[cron-payment-check] Error processing expired booking ${booking.id}:`, err);
         }
       }
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         remindersProcessed: reminderBookings?.length || 0,
         expiredProcessed: expiredBookings?.length || 0,
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error: any) {
     console.error("[cron-payment-check] Error:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });