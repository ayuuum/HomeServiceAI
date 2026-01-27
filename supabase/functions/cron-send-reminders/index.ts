import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildReminderMessage(
    orgName: string,
    customerName: string,
    selectedDate: string,
    selectedTime: string,
    hoursBefore: number
): string {
    let timingText: string;
    if (hoursBefore >= 72) {
        timingText = `${Math.round(hoursBefore / 24)}日後`;
    } else if (hoursBefore >= 48) {
        timingText = "明後日";
    } else if (hoursBefore >= 24) {
        timingText = "明日";
    } else {
        timingText = "本日";
    }

    return `【リマインド】ご予約が${timingText}になりました。\n\n${orgName}\n日時: ${selectedDate} ${selectedTime}\nお名前: ${customerName}様\n\nご来店をお待ちしております。`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("Starting cron-send-reminders job...");

        const now = new Date();

        // Fetch all organizations with LINE configured and their reminder settings
        const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, line_channel_token, line_reminder_hours_before')
            .not('line_channel_token', 'is', null);

        if (orgsError) throw orgsError;

        console.log(`Found ${orgs?.length || 0} organizations with LINE configured`);

        const results: { id: string; hoursBefore: number; status: string; error?: string }[] = [];

        for (const org of (orgs || [])) {
            const reminderHours: number[] = (org as any).line_reminder_hours_before || [24];
            const channelToken = org.line_channel_token;

            if (!channelToken) continue;

            console.log(`Processing org ${org.id} with reminder timings: [${reminderHours.join(', ')}]h`);

            // Fetch pending/confirmed bookings that have linked customers with LINE
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    selected_date,
                    selected_time,
                    customer_name,
                    organization_id,
                    customer_id,
                    line_reminders_sent,
                    customers (
                        line_user_id
                    )
                `)
                .eq('organization_id', org.id)
                .in('status', ['pending', 'confirmed'])
                .not('customer_id', 'is', null);

            if (bookingsError) {
                console.error(`Error fetching bookings for org ${org.id}:`, bookingsError);
                continue;
            }

            for (const booking of (bookings || [])) {
                const customers = booking.customers as { line_user_id: string } | { line_user_id: string }[] | null;
                const lineUserId = Array.isArray(customers) ? customers[0]?.line_user_id : customers?.line_user_id;

                if (!lineUserId) continue;

                // Parse booking datetime
                const bookingDateTime = new Date(`${booking.selected_date}T${booking.selected_time}:00`);
                const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                // Get already-sent reminders from JSONB
                const remindersSent: Record<string, string> = (booking as any).line_reminders_sent || {};

                for (const hoursBefore of reminderHours) {
                    const key = String(hoursBefore);

                    // Skip if this reminder was already sent
                    if (remindersSent[key]) continue;

                    // Check if we're in the window: hoursBefore-1 to hoursBefore+1
                    if (hoursUntilBooking >= (hoursBefore - 1) && hoursUntilBooking <= (hoursBefore + 1)) {
                        try {
                            console.log(`Sending ${hoursBefore}h reminder for booking ${booking.id}`);

                            const message = buildReminderMessage(
                                org.name || 'ハウクリPro',
                                booking.customer_name,
                                booking.selected_date,
                                booking.selected_time,
                                hoursBefore
                            );

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

                            // Update reminders_sent JSONB
                            const updatedSent = { ...remindersSent, [key]: new Date().toISOString() };
                            const updateData: Record<string, unknown> = {
                                line_reminders_sent: updatedSent,
                            };
                            // Also update legacy field for backward compatibility
                            if (hoursBefore === 24) {
                                updateData.line_reminder_sent_at = new Date().toISOString();
                            }

                            const { error: updateError } = await supabase
                                .from('bookings')
                                .update(updateData)
                                .eq('id', booking.id);

                            if (updateError) throw updateError;

                            // Update local state to prevent duplicate sends within same run
                            remindersSent[key] = new Date().toISOString();

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

                            results.push({ id: booking.id, hoursBefore, status: 'sent' });
                        } catch (err: unknown) {
                            console.error(`Error sending ${hoursBefore}h reminder for booking ${booking.id}:`, err);
                            results.push({
                                id: booking.id,
                                hoursBefore,
                                status: 'error',
                                error: err instanceof Error ? err.message : 'Unknown error'
                            });
                        }
                    }
                }
            }
        }

        console.log(`Cron job completed. Results: ${results.length} reminders processed`);

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
