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
  notificationType: 'confirmed' | 'cancelled' | 'reminder' | 'admin_notification' | 'pending' | 'payment_request' | 'payment_completed' | 'payment_reminder' | 'payment_expired';
  adminNotificationType?: 'new_booking' | 'cancelled';
  checkoutUrl?: string;
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
    const body = await req.clone().json();
    const checkoutUrl = body.checkoutUrl;

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
        checkout_expires_at,
        stripe_checkout_session_id,
        customers (
          id,
          name,
          line_user_id,
          email
        ),
        organizations (
          name,
          brand_color,
          line_channel_token,
          logo_url,
          admin_email
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
    // Priority 2: Payment notifications (LINE preferred, fallback to email)
    else if (['payment_request', 'payment_completed', 'payment_reminder', 'payment_expired'].includes(notificationType)) {
      if (hasLine && hasLineConfig) {
        result = await sendLineNotification(booking, customer.line_user_id, org, notificationType, supabase, checkoutUrl);
      } else if (hasEmail) {
        result = await sendEmailNotification(booking, org, notificationType, supabase, undefined, checkoutUrl);
      } else {
        result = {
          success: true,
          channel: 'none',
          message: "No notification channel available for payment notification"
        };
      }
    }
    // Priority 3: LINE (if customer has line_user_id AND org has LINE configured)
    else if (hasLine && hasLineConfig) {
      result = await sendLineNotification(booking, customer.line_user_id, org, notificationType, supabase);
    }
    // Priority 4: Email (if customer has email)
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
  supabase: any,
  checkoutUrl?: string
): Promise<NotificationResult> {
  try {
    console.log(`[send-hybrid-notification] Sending LINE notification to ${lineUserId}`);

    const message = buildLineMessage(booking, notificationType, org.name, checkoutUrl);

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
  adminNotificationType?: string,
  checkoutUrl?: string
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
    const logoUrl = org?.logo_url;
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

    if (notificationType === 'pending') {
      subject = `【${orgName}】ご予約リクエストを受け付けました`;
      htmlContent = buildPendingEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        totalPrice: booking.total_price,
        cancelUrl,
        logoUrl,
      });
    } else if (notificationType === 'confirmed') {
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
        logoUrl,
      });
    } else if (notificationType === 'cancelled') {
      subject = `【${orgName}】ご予約がキャンセルされました`;
      htmlContent = buildCancelledEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        logoUrl,
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
        logoUrl,
      });
    } else if (notificationType === 'payment_request') {
      subject = `【${orgName}】お支払いのお願い`;
      htmlContent = buildPaymentRequestEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        totalPrice: booking.total_price,
        checkoutUrl: checkoutUrl || '',
        expiresAt: booking.checkout_expires_at,
        logoUrl,
      });
    } else if (notificationType === 'payment_completed') {
      subject = `【${orgName}】お支払いが完了しました`;
      htmlContent = buildPaymentCompletedEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        totalPrice: booking.total_price,
        cancelUrl,
        logoUrl,
      });
    } else if (notificationType === 'payment_reminder') {
      subject = `【${orgName}】お支払い期限が近づいています`;
      htmlContent = buildPaymentReminderEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        totalPrice: booking.total_price,
        checkoutUrl: checkoutUrl || '',
        expiresAt: booking.checkout_expires_at,
        logoUrl,
      });
    } else if (notificationType === 'payment_expired') {
      subject = `【${orgName}】決済リンクの有効期限が切れました`;
      htmlContent = buildPaymentExpiredEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        logoUrl,
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
        logoUrl,
      });
    }

    // Determine recipient
    // Priority for admin_notification: 1) org.admin_email, 2) profiles email, 3) ADMIN_EMAIL env var
    const orgAdminEmail = org?.admin_email;
    const adminRecipient = orgAdminEmail || replyToEmail || Deno.env.get("ADMIN_EMAIL");
    const recipientEmail = notificationType === 'admin_notification' ? adminRecipient : booking.customer_email;

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
function buildLineMessage(booking: any, notificationType: string, orgName: string, checkoutUrl?: string): string {
  const dateStr = booking.selected_date;
  const timeStr = booking.selected_time;
  const customerName = booking.customer_name || "お客様";
  const totalPrice = booking.total_price?.toLocaleString() || "0";
  const storeName = orgName || "ハウクリPro";

  switch (notificationType) {
    case 'pending':
      return `📋 ご予約リクエストを受け付けました

${customerName}様

ご予約リクエストありがとうございます。
内容を確認し、日程調整のうえご連絡いたします。

📅 ご希望日時: ${dateStr} ${timeStr}〜
💰 お見積り: ${totalPrice}円

${storeName}`;

    case 'confirmed':
      return `✓ ご予約が確定しました

${customerName}様

下記の日時にお伺いいたします。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

${storeName}`;

    case 'cancelled':
      return `キャンセル完了

${customerName}様

以下のご予約をキャンセルしました。

📅 ${dateStr} ${timeStr}〜

またのご利用をお待ちしております。

${storeName}`;

    case 'reminder':
      return `📅 明日のご予約

${customerName}様

明日お伺いいたします。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

${storeName}`;

    case 'payment_request':
      return `💳 お支払いのお願い

${customerName}様

ご予約が承認されました。
下記リンクよりお支払いをお願いいたします。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

🔗 お支払いはこちら:
${checkoutUrl || ''}

⏰ 有効期限: 72時間

${storeName}`;

    case 'payment_completed':
      return `✅ お支払い完了

${customerName}様

お支払いありがとうございます。
ご予約が確定しました。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

${storeName}`;

    case 'payment_reminder':
      return `⏰ お支払い期限が近づいています

${customerName}様

お支払いがまだ完了していません。
期限切れになる前にお支払いをお願いいたします。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

🔗 お支払いはこちら:
${checkoutUrl || ''}

${storeName}`;

    case 'payment_expired':
      return `❌ 決済期限切れ

${customerName}様

決済リンクの有効期限が切れました。
ご予約を継続される場合は、お手数ですがお問い合わせください。

📅 ${dateStr} ${timeStr}〜

${storeName}`;

    default:
      return `【${storeName}】

${customerName}様

ご予約: ${dateStr} ${timeStr}〜`;
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
  logoUrl?: string;
  checkoutUrl?: string;
  expiresAt?: string;
}

// Shared email wrapper
function emailWrapper(params: { brandColor: string; orgName: string; headerBgColor: string; headerText: string; content: string; showReplyNote?: boolean; logoUrl?: string }): string {
  // Use organization brand color for header background if not explicitly set to something else (like red for errors)
  // But strictly follow the params passed.

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${params.headerBgColor}; padding: 28px 24px; text-align: center;">
              ${params.logoUrl ? `
              <div style="margin-bottom: 16px;">
                <img src="${params.logoUrl}" alt="${params.orgName}" width="60" height="60" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background-color: #ffffff; padding: 2px;">
              </div>
              ` : ''}
              <p style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">${params.headerText}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${params.content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">
                ${params.orgName}
              </p>
              ${params.showReplyNote ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">
                このメールに返信すると、担当者へ直接連絡できます
              </p>
              ` : ''}
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

function buildPendingEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      ご予約リクエストを受け付けました。<br>
      内容を確認し、日程調整のうえご連絡いたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 100px;">ご希望日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">お見積り</td>
              <td style="padding: 10px 0 0; color: ${params.brandColor}; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
        <strong>📋 今後の流れ</strong><br>
        ① 担当者が内容を確認いたします<br>
        ② 日程調整のうえ、確定のご連絡をいたします<br>
        ③ ご希望に添えない場合は、別日程をご提案いたします
      </p>
    </div>
    
    ${params.cancelUrl ? `
    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      キャンセルをご希望の場合は<a href="${params.cancelUrl}" style="color: #64748b;">こちら</a>
    </p>
    ` : ''}
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: params.brandColor,
    headerText: '📋 ご予約リクエストを受け付けました',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildPaymentRequestEmail(params: EmailParams): string {
  const expiresAtFormatted = params.expiresAt 
    ? new Date(params.expiresAt).toLocaleString('ja-JP', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
    : '72時間後';

  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      ご予約が承認されました。<br>
      下記リンクよりお支払いをお願いいたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">金額</td>
              <td style="padding: 10px 0 0; color: ${params.brandColor}; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Payment CTA -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${params.checkoutUrl}" style="display: inline-block; padding: 16px 40px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
        💳 お支払いへ進む
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
        <strong>⏰ お支払い期限</strong><br>
        ${expiresAtFormatted}まで<br>
        期限を過ぎると決済リンクが無効になります。
      </p>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: params.brandColor,
    headerText: '💳 お支払いのお願い',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildPaymentCompletedEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      お支払いありがとうございます。<br>
      ご予約が確定しました。下記の日時にお伺いいたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">お支払い済み</td>
              <td style="padding: 10px 0 0; color: #10b981; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()} ✓
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    ${params.cancelUrl ? `
    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      ご都合が悪くなった場合は<a href="${params.cancelUrl}" style="color: #64748b;">こちら</a>からキャンセルできます
    </p>
    ` : ''}
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: '#10b981',
    headerText: '✅ お支払い完了・ご予約確定',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildPaymentReminderEmail(params: EmailParams): string {
  const expiresAtFormatted = params.expiresAt 
    ? new Date(params.expiresAt).toLocaleString('ja-JP', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
    : '間もなく';

  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      お支払いがまだ完了していません。<br>
      期限切れになる前にお支払いをお願いいたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">金額</td>
              <td style="padding: 6px 0; color: ${params.brandColor}; font-size: 18px; font-weight: 700;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Warning Box -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #dc2626; font-weight: 600;">
        ⚠️ お支払い期限: ${expiresAtFormatted}
      </p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #991b1b;">
        期限を過ぎると決済リンクが無効になります。
      </p>
    </div>
    
    <!-- Payment CTA -->
    <div style="text-align: center;">
      <a href="${params.checkoutUrl}" style="display: inline-block; padding: 16px 40px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
        今すぐお支払い
      </a>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: '#f59e0b',
    headerText: '⏰ お支払い期限が近づいています',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildPaymentExpiredEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      決済リンクの有効期限が切れました。<br>
      ご予約を継続される場合は、お手数ですがお問い合わせください。
    </p>
    
    <!-- Expired Booking -->
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <span style="text-decoration: line-through;">${params.formattedDate} ${params.selectedTime}〜</span>
      </p>
    </div>
    
    <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">
      ご不明な点がございましたら、このメールに返信してお問い合わせください。
    </p>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: '#64748b',
    headerText: '❌ 決済期限切れ',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildConfirmedEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      ご予約が確定しました。<br>
      下記の日時にお伺いいたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">金額</td>
              <td style="padding: 10px 0 0; color: ${params.brandColor}; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    ${params.cancelUrl ? `
    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      ご都合が悪くなった場合は<a href="${params.cancelUrl}" style="color: #64748b;">こちら</a>からキャンセルできます
    </p>
    ` : ''}
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: '#10b981',
    headerText: '✓ ご予約が確定しました',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildCancelledEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      以下のご予約をキャンセルいたしました。
    </p>
    
    <!-- Cancelled Booking -->
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        ${params.formattedDate} ${params.selectedTime}〜
      </p>
    </div>
    
    <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">
      またのご利用をお待ちしております
    </p>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: '#64748b',
    headerText: 'キャンセル完了',
    content,
    showReplyNote: false,
    logoUrl: params.logoUrl,
  });
}

function buildReminderEmail(params: EmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      明日のご予約のリマインダーです。<br>当日お伺いいたします。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    ${params.cancelUrl ? `
    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      ご都合が悪くなった場合は<a href="${params.cancelUrl}" style="color: #64748b;">こちら</a>からキャンセルできます
    </p>
    ` : ''}
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: params.brandColor,
    headerText: '📅 リマインダー',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl,
  });
}

function buildAdminNotificationEmail(params: EmailParams): string {
  const isNew = params.adminNotificationType === 'new_booking';
  const statusLabel = isNew ? '新規予約' : 'キャンセル';
  const statusColor = isNew ? '#4F46E5' : '#dc2626';

  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      管理画面で確認してください。
    </p>
    
    <!-- Booking Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">顧客</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${params.customerName} 様</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">連絡先</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">
                ${params.customerEmail}<br>${params.customerPhone}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">日時</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">
                ${params.formattedDate}<br>${params.selectedTime}〜
              </td>
            </tr>
            ${params.servicesList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">内容</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.servicesList}</td>
            </tr>
            ` : ''}
            ${params.totalPrice ? `
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">金額</td>
              <td style="padding: 10px 0 0; color: #1e293b; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <div style="text-align: center;">
      <a href="${Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app"}/admin" style="display: inline-block; padding: 12px 28px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        管理画面を開く
      </a>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: statusColor,
    headerText: statusLabel,
    content,
    showReplyNote: false,
    logoUrl: params.logoUrl,
  });
}
