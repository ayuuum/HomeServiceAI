import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  bookingId: string;
  emailType: 'confirmation' | 'cancellation' | 'reminder' | 'admin_notification';
  adminNotificationType?: 'new_booking' | 'cancelled';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, emailType, adminNotificationType }: EmailRequest = await req.json();
    
    console.log(`[send-booking-email] Processing ${emailType} email for booking: ${bookingId}`);

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
        selected_date,
        selected_time,
        total_price,
        status,
        cancel_token,
        organization_id,
        cancelled_at,
        organizations(name, brand_color)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("[send-booking-email] Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking services
    const { data: bookingServices } = await supabase
      .from('booking_services')
      .select('service_title, service_quantity, service_base_price')
      .eq('booking_id', bookingId);

    // Fetch booking options
    const { data: bookingOptions } = await supabase
      .from('booking_options')
      .select('option_title, option_quantity, option_price')
      .eq('booking_id', bookingId);

    // Build services list
    const servicesList = (bookingServices || [])
      .map(s => `${s.service_title}${s.service_quantity > 1 ? ` x${s.service_quantity}` : ''}`)
      .join(', ');

    const optionsList = (bookingOptions || [])
      .map(o => `${o.option_title}${o.option_quantity > 1 ? ` x${o.option_quantity}` : ''}`)
      .join(', ');

    // Get organization info
    const orgName = (booking.organizations as any)?.name || '予約システム';
    const brandColor = (booking.organizations as any)?.brand_color || '#4F46E5';

    // Build cancel URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app";
    const cancelUrl = `${baseUrl}/cancel/${booking.cancel_token}`;

    // Format date
    const formattedDate = new Date(booking.selected_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // Handle admin notification
    if (emailType === 'admin_notification') {
      console.log("[send-booking-email] Processing admin notification");
      
      // Fetch admin email from profiles table
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('organization_id', booking.organization_id)
        .not('email', 'is', null)
        .limit(1)
        .maybeSingle();

      if (profileError || !adminProfile?.email) {
        console.log("[send-booking-email] No admin email found for organization:", booking.organization_id);
        return new Response(
          JSON.stringify({ message: "No admin email configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[send-booking-email] Sending admin notification to:", adminProfile.email);

      let subject: string;
      let htmlContent: string;

      if (adminNotificationType === 'cancelled') {
        subject = `【キャンセル通知】${booking.customer_name}様 - ${formattedDate} ${booking.selected_time}〜`;
        htmlContent = buildAdminCancellationEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone,
          orgName,
          formattedDate,
          selectedTime: booking.selected_time,
          servicesList,
          optionsList,
          totalPrice: booking.total_price,
          cancelledAt: booking.cancelled_at,
        });
      } else {
        // New booking notification
        subject = `【新規予約】${booking.customer_name}様 - ${formattedDate} ${booking.selected_time}〜`;
        htmlContent = buildAdminNewBookingEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone,
          orgName,
          brandColor,
          formattedDate,
          selectedTime: booking.selected_time,
          servicesList,
          optionsList,
          totalPrice: booking.total_price,
        });
      }

      // Send email to admin
      const emailResponse = await resend.emails.send({
        from: `${orgName} <onboarding@resend.dev>`,
        to: [adminProfile.email],
        subject,
        html: htmlContent,
      });

      console.log("[send-booking-email] Admin email sent successfully:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For customer emails, check if customer has email
    if (!booking.customer_email) {
      console.log("[send-booking-email] No customer email, skipping");
      return new Response(
        JSON.stringify({ message: "No email address provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content based on type
    let subject: string;
    let htmlContent: string;

    if (emailType === 'confirmation') {
      subject = `【${orgName}】ご予約を受け付けました`;
      htmlContent = buildConfirmationEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        servicesList,
        optionsList,
        totalPrice: booking.total_price,
        cancelUrl,
      });
    } else if (emailType === 'cancellation') {
      subject = `【${orgName}】ご予約のキャンセルが完了しました`;
      htmlContent = buildCancellationEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
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

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${orgName} <onboarding@resend.dev>`,
      to: [booking.customer_email],
      subject,
      html: htmlContent,
    });

    console.log("[send-booking-email] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-booking-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// Email template builders
interface ConfirmationEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  servicesList: string;
  optionsList: string;
  totalPrice: number;
  cancelUrl: string;
}

function buildConfirmationEmail(params: ConfirmationEmailParams): string {
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
          <!-- Header -->
          <tr>
            <td style="background-color: ${params.brandColor}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">予約確認</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${params.customerName} 様
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #333; line-height: 1.6;">
                ご予約いただきありがとうございます。<br>
                以下の内容で予約を受け付けました。
              </p>
              
              <!-- Booking Details -->
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
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">サービス</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${params.servicesList}</td>
                      </tr>
                      ${params.optionsList ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">オプション</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${params.optionsList}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 12px 0 0; color: #666; font-size: 14px; border-top: 1px solid #ddd;">合計金額</td>
                        <td style="padding: 12px 0 0; color: ${params.brandColor}; font-size: 20px; font-weight: bold; border-top: 1px solid #ddd;">
                          ¥${params.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Status Notice -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  ※現在、ご予約は「確認中」のステータスです。<br>
                  担当者が確認次第、確定のご連絡をいたします。
                </p>
              </div>
              
              <!-- Cancel Section -->
              <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
                <p style="margin: 0 0 15px; font-size: 14px; color: #666;">
                  予約をキャンセルする場合は以下のボタンをクリックしてください
                </p>
                <a href="${params.cancelUrl}" style="display: inline-block; padding: 12px 30px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">
                  予約をキャンセル
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
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

interface CancellationEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
}

function buildCancellationEmail(params: CancellationEmailParams): string {
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
                ご予約のキャンセルが完了しました。
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

interface ReminderEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  servicesList: string;
  cancelUrl: string;
}

function buildReminderEmail(params: ReminderEmailParams): string {
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
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">リマインダー</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                ${params.customerName} 様
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                明日のご予約についてお知らせいたします。
              </p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #333;">
                  <strong>日時：</strong>${params.formattedDate} ${params.selectedTime}〜
                </p>
                <p style="margin: 0; font-size: 14px; color: #333;">
                  <strong>サービス：</strong>${params.servicesList}
                </p>
              </div>
              <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
                ご予定に変更がある場合は、以下のリンクからキャンセルできます。
              </p>
              <div style="text-align: center;">
                <a href="${params.cancelUrl}" style="color: #dc3545; font-size: 14px;">
                  予約をキャンセル
                </a>
              </div>
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

// Admin notification email templates
interface AdminCancellationEmailParams {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  orgName: string;
  formattedDate: string;
  selectedTime: string;
  servicesList: string;
  optionsList: string;
  totalPrice: number;
  cancelledAt: string | null;
}

function buildAdminCancellationEmail(params: AdminCancellationEmailParams): string {
  const cancelledAtFormatted = params.cancelledAt 
    ? new Date(params.cancelledAt).toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : new Date().toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

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
          <!-- Header - Red for cancellation alert -->
          <tr>
            <td style="background-color: #dc3545; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ キャンセル通知</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                以下の予約がお客様によりキャンセルされました。
              </p>
              
              <!-- Customer Info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff3cd; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 16px; color: #856404;">
                      👤 顧客情報
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px; width: 80px;">お名前</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px; font-weight: bold;">${params.customerName} 様</td>
                      </tr>
                      ${params.customerPhone ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">電話番号</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.customerPhone}</td>
                      </tr>
                      ` : ''}
                      ${params.customerEmail ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">メール</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.customerEmail}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Booking Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 16px; color: #333;">
                      📅 キャンセルされた予約
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px; width: 100px;">予約日時</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px; font-weight: bold;">
                          ${params.formattedDate} ${params.selectedTime}〜
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">サービス</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.servicesList || '（なし）'}</td>
                      </tr>
                      ${params.optionsList ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">オプション</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.optionsList}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">合計金額</td>
                        <td style="padding: 5px 0; color: #dc3545; font-size: 16px; font-weight: bold;">
                          ¥${params.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Cancellation Info -->
              <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 14px; color: #721c24;">
                  <strong>キャンセル日時：</strong>${cancelledAtFormatted}<br>
                  <strong>キャンセル理由：</strong>顧客によるキャンセル
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
                この時間枠を再度公開する場合は、管理画面から操作してください。
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${params.orgName} - 管理者通知
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

interface AdminNewBookingEmailParams {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  servicesList: string;
  optionsList: string;
  totalPrice: number;
}

function buildAdminNewBookingEmail(params: AdminNewBookingEmailParams): string {
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
          <!-- Header - Green for new booking -->
          <tr>
            <td style="background-color: #28a745; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 新規予約</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                新しい予約が入りました！
              </p>
              
              <!-- Customer Info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #d4edda; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 16px; color: #155724;">
                      👤 顧客情報
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px; width: 80px;">お名前</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px; font-weight: bold;">${params.customerName} 様</td>
                      </tr>
                      ${params.customerPhone ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">電話番号</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.customerPhone}</td>
                      </tr>
                      ` : ''}
                      ${params.customerEmail ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">メール</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.customerEmail}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Booking Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 16px; color: #333;">
                      📅 予約内容
                    </h2>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px; width: 100px;">予約日時</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px; font-weight: bold;">
                          ${params.formattedDate} ${params.selectedTime}〜
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">サービス</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.servicesList || '（なし）'}</td>
                      </tr>
                      ${params.optionsList ? `
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">オプション</td>
                        <td style="padding: 5px 0; color: #333; font-size: 14px;">${params.optionsList}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 5px 0; color: #666; font-size: 14px;">合計金額</td>
                        <td style="padding: 5px 0; color: #28a745; font-size: 16px; font-weight: bold;">
                          ¥${params.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
                管理画面から予約を確認・確定してください。
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                ${params.orgName} - 管理者通知
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

serve(handler);
