import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("Starting cron-send-reminders job...");

        // 1. Fetch bookings that are ~24 hours away and haven't sent reminder
        // We look for bookings between 23 and 25 hours from now to be safe
        const now = new Date();
        const targetMin = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
        const targetMax = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

        console.log(`Searching for bookings scheduled between ${targetMin} and ${targetMax}`);

        // Since selected_date and selected_time are separate text/date columns, 
        // we use a RAW query or join logic.
        // However, to keep it simple and avoid complex casting in PostgREST,
        // we fetch active bookings and filter in JS if needed, or use a specific join.

        const { data: pendingBookings, error: fetchError } = await supabase
            .from('bookings')
            .select(`
        id,
        selected_date,
        selected_time,
        customer_name,
        organization_id,
        organizations (
          line_channel_token,
          name
        ),
        customers (
          line_user_id
        )
      `)
            .eq('status', 'pending')
            .is('line_reminder_sent_at', null);

        if (fetchError) throw fetchError;

        console.log(`Found ${pendingBookings?.length || 0} potential bookings to check.`);

        const results = [];

        for (const booking of (pendingBookings || [])) {
            try {
                const lineUserId = booking.customers?.line_user_id;
                const channelToken = booking.organizations?.line_channel_token;
                const orgName = booking.organizations?.name;

                if (!lineUserId || !channelToken) {
                    console.log(`Skipping booking ${booking.id}: missing lineUserId or channelToken`);
                    continue;
                }

                // Combine date and time to check if it's in the window
                // selected_date: "2026-01-26", selected_time: "10:00"
                const bookingDateTime = new Date(`${booking.selected_date}T${booking.selected_time}:00`);
                const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                // Send reminder if between 23 and 25 hours away
                if (hoursUntilBooking >= 23 && hoursUntilBooking <= 25) {
                    console.log(`Sending reminder for booking ${booking.id} (Scheduled: ${booking.selected_date} ${booking.selected_time})`);

                    const message = `【リマインド】ご予約が明日になりました。\n\n${orgName}\n日時: ${booking.selected_date} ${booking.selected_time}\nお名前: ${booking.customer_name}様\n\nご来店をお待ちしております。`;

                    const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${channelToken}`,
                        },
                        body: JSON.stringify({
                            to: lineUserId,
                            messages: [{ type: "text", text: message }],
                        }),
                    });

                    if (!lineRes.ok) {
                        const errorText = await lineRes.text();
                        throw new Error(`LINE API Error: ${lineRes.status} ${errorText}`);
                    }

                    // Update reminder status
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({ line_reminder_sent_at: new Date().toISOString() })
                        .eq('id', booking.id);

                    if (updateError) throw updateError;

                    // Log message
                    await supabase.from('line_messages').insert({
                        organization_id: booking.organization_id,
                        customer_id: booking.customer_id,
                        line_user_id: lineUserId,
                        direction: "outbound",
                        message_type: "text",
                        content: message,
                        sent_at: new Date().toISOString()
                    });

                    results.push({ id: booking.id, status: 'sent' });
                }
            } catch (err) {
                console.error(`Error processing booking ${booking.id}:`, err);
                results.push({ id: booking.id, status: 'error', error: err.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("cron-send-reminders error:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "不明なエラー" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
