import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HybridNotificationRequest {
  bookingId: string;
  notificationType: 'confirmed' | 'cancelled' | 'reminder' | 'admin_notification';
  adminNotificationType?: 'new_booking' | 'cancelled';
}

interface NotificationResult {
  success: boolean;
  channel: 'line' | 'email' | 'none';
  message: string;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, notificationType, adminNotificationType }: HybridNotificationRequest = await req.json();

    if (!bookingId || !notificationType) {
      return new Response(
        JSON.stringify({ error: "bookingId and notificationType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-hybrid-notification] Processing ${notificationType} for booking: ${bookingId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with customer and organization info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
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
        cancel_token,
        organization_id,
        cancelled_at,
        customers (
          id,
          name,
          line_user_id,
          email
        ),
        organizations (
          name,
          brand_color,
          line_channel_token
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("[send-hybrid-notification] Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine notification channel
    const customer = booking.customers as any;
    const hasLine = !!customer?.line_user_id;
    const hasEmail = !!booking.customer_email;
    const org = booking.organizations as any;
    const hasLineConfig = !!org?.line_channel_token;

    console.log(`[send-hybrid-notification] Customer has LINE: ${hasLine}, has Email: ${hasEmail}, LINE configured: ${hasLineConfig}`);

    let result: NotificationResult;

    // Priority 1: Admin Notification
    if (notificationType === 'admin_notification') {
      result = await sendEmailNotification(booking, org, notificationType, supabase, adminNotificationType);
    }
    // Priority 2: LINE (if customer has line_user_id AND org has LINE configured)
    else if (hasLine && hasLineConfig) {
      result = await sendLineNotification(booking, customer.line_user_id, org, notificationType, supabase);
    }
    // Priority 3: Email (if customer has email)
    else if (hasEmail) {
      result = await sendEmailNotification(booking, org, notificationType, supabase);
    }
    // No channel available
    else {
      result = {
        success: true,
        channel: 'none',
        message: "No notification channel available (no LINE or email)"
      };
      console.log("[send-hybrid-notification] No notification channel available");
    }

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-hybrid-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Send LINE notification
async function sendLineNotification(
  booking: any,
  lineUserId: string,
  org: any,
  notificationType: string,
  supabase: any
): Promise<NotificationResult> {
  try {
    console.log(`[send-hybrid-notification] Sending LINE notification to ${lineUserId}`);

    const message = buildLineMessage(booking, notificationType, org.name);

    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${org.line_channel_token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error("[send-hybrid-notification] LINE API error:", errorText);
      return {
        success: false,
        channel: 'line',
        message: "Failed to send LINE message",
        error: errorText
      };
    }

    // Log the sent message
    await supabase.from("line_messages").insert({
      organization_id: booking.organization_id,
      customer_id: booking.customer_id,
      line_user_id: lineUserId,
      content: message,
      direction: "outbound",
      message_type: "text",
    });

    console.log("[send-hybrid-notification] LINE notification sent successfully");
    return {
      success: true,
      channel: 'line',
      message: "LINE notification sent successfully"
    };
  } catch (error: any) {
    console.error("[send-hybrid-notification] LINE error:", error);
    return {
      success: false,
      channel: 'line',
      message: "Failed to send LINE notification",
      error: error.message
    };
  }
}

// Send Email notification
async function sendEmailNotification(
  booking: any,
  org: any,
  notificationType: string,
  supabase: any,
  adminNotificationType?: string
): Promise<NotificationResult> {
  try {
    console.log(`[send-hybrid-notification] Sending email notification to ${booking.customer_email}`);

    // Fetch admin email for Reply-To
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', booking.organization_id)
      .not('email', 'is', null)
      .limit(1)
      .maybeSingle();

    // Fetch booking services
    const { data: bookingServices } = await supabase
      .from('booking_services')
      .select('service_title, service_quantity, service_base_price')
      .eq('booking_id', booking.id);

    // Build services list
    const servicesList = (bookingServices || [])
      .map((s: any) => `${s.service_title}${s.service_quantity > 1 ? ` x${s.service_quantity}` : ''}`)
      .join(', ');

    const orgName = org?.name || '予約システム';
    const brandColor = org?.brand_color || '#4F46E5';
    const replyToEmail = adminProfile?.email;

    // Format date
    const formattedDate = new Date(booking.selected_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // Build cancel URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app";
    const cancelUrl = `${baseUrl}/cancel/${booking.cancel_token}`;

    let subject: string;
    let htmlContent: string;

    if (notificationType === 'confirmed') {
      subject = `【${orgName}】ご予約が確定しました`;
      htmlContent = buildConfirmedEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        totalPrice: booking.total_price,
        cancelUrl,
      });
    } else if (notificationType === 'cancelled') {
      subject = `【${orgName}】ご予約がキャンセルされました`;
      htmlContent = buildCancelledEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
      });
    } else if (notificationType === 'admin_notification') {
      const typeLabel = adminNotificationType === 'new_booking' ? '新規予約' : 'キャンセル';
      subject = `【管理通知】${typeLabel}のお知らせ (${booking.customer_name}様)`;
      htmlContent = buildAdminNotificationEmail({
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        totalPrice: booking.total_price,
        adminNotificationType: adminNotificationType || 'new_booking',
      });
    } else {
      subject = `【${orgName}】明日のご予約リマインダー`;
      htmlContent = buildReminderEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        cancelUrl,
      });
    }

    // Determine recipient
    const recipientEmail = notificationType === 'admin_notification' ? (replyToEmail || Deno.env.get("ADMIN_EMAIL")) : booking.customer_email;

    if (!recipientEmail) {
      return {
        success: false,
        channel: 'email',
        message: "Recipient email not found"
      };
    }

    // Send email via Resend with Reply-To header
    const emailResponse = await resend.emails.send({
      from: `${orgName} <info@amber-inc.com>`,
      reply_to: replyToEmail || undefined,
      to: [recipientEmail],
      subject,
      html: htmlContent,
    });

    console.log(`[send-hybrid-notification] Email sent successfully${replyToEmail ? ` (reply-to: ${replyToEmail})` : ''}`);
    return {
      success: true,
      channel: 'email',
      message: `Email notification sent successfully${replyToEmail ? ' with reply-to' : ''}`
    };
  } catch (error: any) {
    console.error("[send-hybrid-notification] Email error:", error);
    return {
      success: false,
      channel: 'email',
      message: "Failed to send email notification",
      error: error.message
    };
  }
}

// Build LINE message
function buildLineMessage(booking: any, notificationType: string, orgName: string): string {
  const dateStr = booking.selected_date;
  const timeStr = booking.selected_time;
  const customerName = booking.customer_name || "お客様";
  const totalPrice = booking.total_price?.toLocaleString() || "0";
  const storeName = orgName || "ハウクリPro";

  switch (notificationType) {
    case 'confirmed':
      return `【${storeName}】ご予約確定のお知らせ

${customerName}様

ご予約が確定いたしました。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

ご来店をお待ちしております。

※キャンセルをご希望の場合は、お早めにご連絡ください。`;

    case 'cancelled':
      return `【${storeName}】ご予約キャンセルのお知らせ

${customerName}様

以下のご予約がキャンセルされました。

📅 ${dateStr} ${timeStr}〜

またのご利用をお待ちしております。`;

    case 'reminder':
      return `【${storeName}】ご予約リマインダー

${customerName}様

明日のご予約のリマインダーです。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

ご来店をお待ちしております。`;

    default:
      return `【${storeName}】ご予約に関するお知らせ

${customerName}様

ご予約内容: ${dateStr} ${timeStr}〜`;
  }
}

// Email template builders
interface EmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  servicesList?: string;
  totalPrice?: number;
  cancelUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
  adminNotificationType?: string;
}

function buildConfirmedEmail(params: EmailParams): string {
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
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✓ 予約確定</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${params.customerName} 様
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #333; line-height: 1.6;">
                ご予約が確定いたしました。<br>
                ご来店をお待ちしております。
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; font-size: 18px; color: ${params.brandColor}; border-bottom: 2px solid ${params.brandColor}; padding-bottom: 10px;">
                      ご予約内容
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 100px;">日時</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">
                          ${params.formattedDate}<br>${params.selectedTime}〜
                        </td>
                      </tr>
                      ${params.servicesList ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">サービス</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${params.servicesList}</td>
                      </tr>
                      ` : ''}
                      ${params.totalPrice ? `
                      <tr>
                        <td style="padding: 12px 0 0; color: #666; font-size: 14px; border-top: 1px solid #ddd;">合計金額</td>
                        <td style="padding: 12px 0 0; color: ${params.brandColor}; font-size: 20px; font-weight: bold; border-top: 1px solid #ddd;">
                          ¥${params.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${params.cancelUrl ? `
              <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
                <p style="margin: 0 0 15px; font-size: 14px; color: #666;">
                  キャンセルをご希望の場合
                </p>
                <a href="${params.cancelUrl}" style="display: inline-block; padding: 12px 30px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">
                  予約をキャンセル
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${params.orgName}
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
                ※このメールに返信いただくと、店舗へ直接お問い合わせができます。
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

function buildCancelledEmail(params: EmailParams): string {
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
            <td style="background-color: #6c757d; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">キャンセル完了</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${params.customerName} 様
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                以下のご予約がキャンセルされました。
              </p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>キャンセルした予約：</strong><br>
                  ${params.formattedDate} ${params.selectedTime}〜
                </p>
              </div>
              <p style="margin: 0; font-size: 14px; color: #666;">
                またのご利用をお待ちしております。
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${params.orgName}
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

function buildReminderEmail(params: EmailParams): string {
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
            <td style="background-color: ${params.brandColor}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📅 リマインダー</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${params.customerName} 様
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                明日のご予約のリマインダーです。<br>
                ご来店をお待ちしております。
              </p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>ご予約内容：</strong><br>
                  ${params.formattedDate} ${params.selectedTime}〜
                  ${params.servicesList ? `<br>${params.servicesList}` : ''}
                </p>
              </div>
              ${params.cancelUrl ? `
              <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
                <p style="margin: 0 0 15px; font-size: 14px; color: #666;">
                  ご都合が悪くなった場合
                </p>
                <a href="${params.cancelUrl}" style="display: inline-block; padding: 12px 30px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">
                  予約をキャンセル
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${params.orgName}
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
                ※このメールに返信いただくと、店舗へ直接お問い合わせができます。
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

function buildAdminNotificationEmail(params: EmailParams): string {
  const isNew = params.adminNotificationType === 'new_booking';
  const statusLabel = isNew ? '新規予約申込み' : '予約キャンセル';
  const statusColor = isNew ? '#4F46E5' : '#dc3545';

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
            <td style="background-color: ${statusColor}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${statusLabel}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                管理画面より内容を確認してください。
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                      予約詳細
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 100px;">顧客名</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${params.customerName} 様</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">連絡先</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">
                          ${params.customerEmail}<br>${params.customerPhone}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">日時</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">
                          ${params.formattedDate}<br>${params.selectedTime}〜
                        </td>
                      </tr>
                      ${params.servicesList ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">サービス</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${params.servicesList}</td>
                      </tr>
                      ` : ''}
                      ${params.totalPrice ? `
                      <tr>
                        <td style="padding: 12px 0 0; color: #666; font-size: 14px; border-top: 1px solid #ddd;">合計金額</td>
                        <td style="padding: 12px 0 0; color: #333; font-size: 20px; font-weight: bold; border-top: 1px solid #ddd;">
                          ¥${params.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <a href="${Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app"}/admin" style="display: inline-block; padding: 12px 30px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">
                  管理画面を開く
                </a>
              </div>
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
