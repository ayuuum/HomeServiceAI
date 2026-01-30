import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

function buildReminderEmailHtml(
    orgName: string,
    customerName: string,
    selectedDate: string,
    selectedTime: string,
    hoursBefore: number,
    brandColor: string
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

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: ${brandColor}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📅 ご予約リマインダー</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${customerName} 様
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #333; line-height: 1.6;">
                ご予約が<strong>${timingText}</strong>になりました。<br>
                ご来店をお待ちしております。
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; font-size: 18px; color: ${brandColor}; border-bottom: 2px solid ${brandColor}; padding-bottom: 10px;">
                      ご予約内容
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 100px;">日時</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">
                          ${selectedDate}<br>${selectedTime}〜
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #666;">
                ご不明な点がございましたら、お気軽にお問い合わせください。
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${orgName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
}

async function sendEmailReminder(
    booking: {
        id: string;
        customer_name: string;
        customer_email: string;
        selected_date: string;
        selected_time: string;
        organization_id: string;
    },
    org: {
        name: string;
        brand_color?: string;
    },
    hoursBefore: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const orgName = org.name || '予約システム';
        const brandColor = org.brand_color || '#4F46E5';

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

        const subject = `【${orgName}】ご予約が${timingText}になりました`;
        const htmlContent = buildReminderEmailHtml(
            orgName,
            booking.customer_name,
            booking.selected_date,
            booking.selected_time,
            hoursBefore,
            brandColor
        );

        await resend.emails.send({
            from: `${orgName} <noreply@amber-inc.com>`,
            to: [booking.customer_email],
            subject,
            html: htmlContent,
        });

        console.log(`[cron-send-reminders] Email reminder sent to ${booking.customer_email}`);
        return { success: true };
    } catch (error) {
        console.error(`[cron-send-reminders] Email error:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
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
                            // Priority 1: LINE (if available)
                            if (lineUserId && hasLineConfig) {
                                console.log(`Sending ${hoursBefore}h LINE reminder for booking ${booking.id}`);

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

                                results.push({ id: booking.id, hoursBefore, status: 'sent', channel: 'line' });
                            }
                            // Priority 2: Email (if LINE not available but email exists)
                            else if (customerEmail) {
                                console.log(`Sending ${hoursBefore}h email reminder for booking ${booking.id}`);

                                const emailResult = await sendEmailReminder(
                                    {
                                        id: booking.id,
                                        customer_name: booking.customer_name,
                                        customer_email: customerEmail,
                                        selected_date: booking.selected_date,
                                        selected_time: booking.selected_time,
                                        organization_id: booking.organization_id,
                                    },
                                    {
                                        name: org.name,
                                        brand_color: org.brand_color || undefined,
                                    },
                                    hoursBefore
                                );

                                if (!emailResult.success) {
                                    throw new Error(emailResult.error || 'Email send failed');
                                }

                                results.push({ id: booking.id, hoursBefore, status: 'sent', channel: 'email' });
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
