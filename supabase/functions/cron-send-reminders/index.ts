import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));


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

        // Fetch all organizations with reminder settings (LINE or email capable)
        const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, brand_color, line_channel_token, line_reminder_hours_before');

        if (orgsError) throw orgsError;

        console.log(`Found ${orgs?.length || 0} organizations to process`);

        const results: { id: string; hoursBefore: number; status: string; channel: string; error?: string }[] = [];

        for (const org of (orgs || [])) {
            const reminderHours: number[] = (org as any).line_reminder_hours_before || [24];
            const channelToken = org.line_channel_token;
            const hasLineConfig = !!channelToken;

            console.log(`Processing org ${org.id} with reminder timings: [${reminderHours.join(', ')}]h, LINE: ${hasLineConfig}`);

            // Fetch pending/confirmed bookings with customer info (including email)
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    selected_date,
                    selected_time,
                    customer_name,
                    customer_email,
                    organization_id,
                    customer_id,
                    line_reminders_sent,
                    customers (
                        line_user_id,
                        email
                    )
                `)
                .eq('organization_id', org.id)
                .in('status', ['pending', 'confirmed']);

            if (bookingsError) {
                console.error(`Error fetching bookings for org ${org.id}:`, bookingsError);
                continue;
            }

            for (const booking of (bookings || [])) {
                const customers = booking.customers as { line_user_id: string; email?: string } | { line_user_id: string; email?: string }[] | null;
                const lineUserId = Array.isArray(customers) ? customers[0]?.line_user_id : customers?.line_user_id;
                const customerEmail = booking.customer_email || (Array.isArray(customers) ? customers[0]?.email : customers?.email);

                // Skip if no contact method
                if (!lineUserId && !customerEmail) continue;

                // Parse booking datetime
                const bookingDateTime = new Date(`${booking.selected_date}T${booking.selected_time}:00+09:00`);
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
                            console.log(`Sending ${hoursBefore}h reminder for booking ${booking.id} via hybrid notification`);

                            const { data: notificationData, error: notificationError } = await supabase.functions.invoke("send-hybrid-notification", {
                                body: {
                                    bookingId: booking.id,
                                    notificationType: "reminder"
                                }
                            });

                            if (notificationError) {
                                throw new Error(`Notification Error: ${notificationError.message || JSON.stringify(notificationError)}`);
                            }

                            if (!notificationData?.success) {
                                throw new Error(`Notification failed: ${notificationData?.message || "Unknown error"}`);
                            }

                            console.log(`Hybrid notification result for booking ${booking.id}: ${notificationData.channel}`);

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

                            // Update status to 'sent'
                            results.push({ id: booking.id, hoursBefore, status: 'sent', channel: notificationData.channel });
                        } catch (err: unknown) {
                            console.error(`Error sending ${hoursBefore}h reminder for booking ${booking.id}:`, err);
                            results.push({
                                id: booking.id,
                                hoursBefore,
                                status: 'error',
                                channel: lineUserId && hasLineConfig ? 'line' : 'email',
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
