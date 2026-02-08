import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { format, subHours } from "https://esm.sh/date-fns@2.30.0";

/**
 * Cron Job: Post-Service Survey
 * 
 * Runs every hour to check for completed bookings that:
 * 1. Were completed 24+ hours ago
 * 2. Haven't received a survey yet
 * 
 * Sends a satisfaction survey link and (if high satisfaction) Google review request
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CompletedBooking {
    id: string;
    customer_name: string;
    customer_email: string | null;
    organization_id: string;
    organization_name: string;
    google_review_url: string | null;
    line_user_id: string | null;
    channel_token: string | null;
}

async function sendLineMessage(channelToken: string, lineUserId: string, message: string): Promise<boolean> {
    try {
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
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

        if (!response.ok) {
            console.error("LINE API error:", response.status, await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error("LINE send error:", error);
        return false;
    }
}

async function sendSurveyEmail(
    email: string,
    customerName: string,
    organizationName: string,
    surveyUrl: string,
    googleReviewUrl: string | null
): Promise<boolean> {
    try {
        const { error } = await resend.emails.send({
            from: `${organizationName} <${Deno.env.get("SENDER_EMAIL") || "noreply@example.com"}>`,
            to: email,
            subject: `【${organizationName}】サービスのご利用ありがとうございました`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${customerName}様</h2>
          <p>この度は${organizationName}をご利用いただき、誠にありがとうございました。</p>
          
          <p>サービスの品質向上のため、簡単なアンケートにご協力いただけますと幸いです。</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${surveyUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              アンケートに回答する（1分）
            </a>
          </div>
          
          ${googleReviewUrl ? `
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0;"><strong>🌟 よろしければ口コミもお願いします</strong></p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              サービスにご満足いただけましたら、Google口コミでのご評価をいただけますと大変励みになります。
            </p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="${googleReviewUrl}" 
                 style="color: #4F46E5; text-decoration: underline;">
                Googleで口コミを書く →
              </a>
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>このメールは${organizationName}からHaukuri Proを通じて送信されています。</p>
          </div>
        </div>
      `,
        });

        if (error) {
            console.error("Resend error:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
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

        // Find completed bookings from 24-48 hours ago that haven't received survey
        const now = new Date();
        const twentyFourHoursAgo = subHours(now, 24);
        const fortyEightHoursAgo = subHours(now, 48);

        const { data: bookings, error: fetchError } = await supabase
            .from('bookings')
            .select(`
        id,
        customer_name,
        customer_email,
        organization_id,
        customers!inner(line_user_id),
        organizations!inner(
          name,
          google_review_url,
          line_channel_token
        )
      `)
            .eq('status', 'completed')
            .eq('survey_sent_at', null)
            .gte('updated_at', fortyEightHoursAgo.toISOString())
            .lte('updated_at', twentyFourHoursAgo.toISOString())
            .limit(50);

        if (fetchError) {
            console.error("Error fetching bookings:", fetchError);
            throw fetchError;
        }

        console.log(`Found ${bookings?.length || 0} bookings to send surveys`);

        const results = {
            total: bookings?.length || 0,
            lineSuccess: 0,
            emailSuccess: 0,
            failed: 0
        };

        for (const booking of bookings || []) {
            const org = booking.organizations as any;
            const customer = booking.customers as any;

            // Generate survey URL (you can customize this)
            const siteUrl = Deno.env.get("SITE_URL");
            if (!siteUrl) {
                console.error("[cron-post-service-survey] SITE_URL environment variable is required");
                continue;
            }
            const surveyUrl = `${siteUrl}/survey/${booking.id}`;

            let sent = false;

            // Try LINE first
            if (customer?.line_user_id && org?.line_channel_token) {
                const message = `【${org.name}】\n${booking.customer_name}様\n\nこの度はご利用いただきありがとうございました！\n\n簡単なアンケートにご協力いただけますと幸いです✨\n\n${surveyUrl}${org.google_review_url ? `\n\n🌟 よろしければGoogle口コミもお願いします\n${org.google_review_url}` : ''}`;

                sent = await sendLineMessage(org.line_channel_token, customer.line_user_id, message);
                if (sent) {
                    results.lineSuccess++;
                }
            }

            // Fallback to email
            if (!sent && booking.customer_email) {
                sent = await sendSurveyEmail(
                    booking.customer_email,
                    booking.customer_name,
                    org.name,
                    surveyUrl,
                    org.google_review_url
                );
                if (sent) {
                    results.emailSuccess++;
                }
            }

            if (sent) {
                // Mark survey as sent
                await supabase
                    .from('bookings')
                    .update({ survey_sent_at: now.toISOString() })
                    .eq('id', booking.id);
            } else {
                results.failed++;
                console.error(`Failed to send survey for booking ${booking.id}`);
            }
        }

        console.log("Survey cron completed:", results);

        return new Response(JSON.stringify({
            success: true,
            results
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("cron-post-service-survey error:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
