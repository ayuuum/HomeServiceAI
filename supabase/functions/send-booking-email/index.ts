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
  emailType: 'confirmation' | 'cancellation' | 'reminder' | 'admin_notification' | 'reschedule';
  adminNotificationType?: 'new_booking' | 'cancelled';
  oldDate?: string;
  oldTime?: string;
  newDate?: string;
  newTime?: string;
}

// iCal date format helper
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Generate iCal content
function generateICalEvent(params: {
  bookingId: string;
  title: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  orgName: string;
}): string {
  const now = new Date();
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${params.orgName}//Booking System//JP
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${params.bookingId}@booking.lovable.app
DTSTAMP:${formatICalDate(now)}
DTSTART:${formatICalDate(params.startDate)}
DTEND:${formatICalDate(params.endDate)}
SUMMARY:${params.title}
DESCRIPTION:${params.description.replace(/\n/g, '\\n')}
${params.location ? `LOCATION:${params.location}` : ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, emailType, adminNotificationType, oldDate, oldTime, newDate, newTime }: EmailRequest = await req.json();

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
        customer_address,
        selected_date,
        selected_time,
        total_price,
        status,
        cancel_token,
        organization_id,
        cancelled_at,
        organizations(name, brand_color, admin_email, logo_url)
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
    const orgAdminEmail = (booking.organizations as any)?.admin_email;
    const logoUrl = (booking.organizations as any)?.logo_url;

    // Build URLs
    const baseUrl = Deno.env.get("SITE_URL") || "https://cleaning-booking.lovable.app";
    const cancelUrl = `${baseUrl}/cancel/${booking.cancel_token}`;
    const rescheduleUrl = `${baseUrl}/reschedule/${booking.cancel_token}`;

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

      // First, try to get admin_email from organization
      let adminEmail = orgAdminEmail;

      // Fallback: get oldest profile's email if admin_email is not set
      if (!adminEmail) {
        console.log("[send-booking-email] No admin_email in organization, falling back to oldest profile");
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('organization_id', booking.organization_id)
          .not('email', 'is', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        adminEmail = adminProfile?.email;
      }

      if (!adminEmail) {
        console.log("[send-booking-email] No admin email found for organization:", booking.organization_id);
        return new Response(
          JSON.stringify({ message: "No admin email configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[send-booking-email] Sending admin notification to:", adminEmail);

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
          logoUrl,
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
          logoUrl,
        });
      }

      // Send email to admin
      const emailResponse = await resend.emails.send({
        from: `${orgName} <noreply@amber-inc.com>`,
        to: [adminEmail],
        subject,
        html: htmlContent,
        reply_to: orgAdminEmail || undefined,
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
    let icalAttachment: { filename: string; content: string; content_type: string } | null = null;

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
        rescheduleUrl,
        logoUrl,
      });

      // Generate iCal for confirmation
      const startTime = booking.selected_time.split(':');
      const startDate = new Date(booking.selected_date);
      startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1] || '0'), 0, 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

      const icalContent = generateICalEvent({
        bookingId: booking.id,
        title: `【予約】${orgName}`,
        description: `サービス: ${servicesList}${optionsList ? `\\nオプション: ${optionsList}` : ''}\\n合計: ¥${booking.total_price.toLocaleString()}`,
        location: booking.customer_address || undefined,
        startDate,
        endDate,
        orgName,
      });

      icalAttachment = {
        filename: 'booking.ics',
        content: btoa(unescape(encodeURIComponent(icalContent))),
        content_type: 'text/calendar; charset=utf-8',
      };

    } else if (emailType === 'cancellation') {
      subject = `【${orgName}】ご予約のキャンセルが完了しました`;
      htmlContent = buildCancellationEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        formattedDate,
        selectedTime: booking.selected_time,
        logoUrl,
      });
    } else if (emailType === 'reschedule') {
      subject = `【${orgName}】ご予約の日時変更が完了しました`;

      const oldFormattedDate = oldDate ? new Date(oldDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }) : '';

      htmlContent = buildRescheduleEmail({
        customerName: booking.customer_name,
        orgName,
        brandColor,
        oldFormattedDate,
        oldTime: oldTime || '',
        newFormattedDate: formattedDate,
        newTime: booking.selected_time,
        servicesList,
        cancelUrl,
        rescheduleUrl,
        logoUrl,
      });

      // Generate updated iCal
      const startTime = booking.selected_time.split(':');
      const startDate = new Date(booking.selected_date);
      startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1] || '0'), 0, 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const icalContent = generateICalEvent({
        bookingId: booking.id,
        title: `【予約】${orgName}`,
        description: `サービス: ${servicesList}\\n合計: ¥${booking.total_price.toLocaleString()}`,
        location: booking.customer_address || undefined,
        startDate,
        endDate,
        orgName,
      });

      icalAttachment = {
        filename: 'booking-updated.ics',
        content: btoa(unescape(encodeURIComponent(icalContent))),
        content_type: 'text/calendar; charset=utf-8',
      };

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
        rescheduleUrl,
        logoUrl,
      });
    }

    // Send email via Resend
    const emailPayload: any = {
      from: `${orgName} <noreply@amber-inc.com>`,
      to: [booking.customer_email],
      subject,
      html: htmlContent,
      reply_to: orgAdminEmail || undefined,
    };

    if (icalAttachment) {
      emailPayload.attachments = [icalAttachment];
    }

    const emailResponse = await resend.emails.send(emailPayload);

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
  rescheduleUrl: string;
}

// Shared email wrapper
function emailWrapper(params: { brandColor: string; orgName: string; headerBgColor: string; headerText: string; content: string; showReplyNote?: boolean; logoUrl?: string }): string {
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
  rescheduleUrl: string;
  logoUrl?: string;
}

function buildConfirmationEmail(params: ConfirmationEmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      ご予約いただきありがとうございます。<br>
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
            ${params.optionsList ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">オプション</td>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${params.optionsList}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">金額</td>
              <td style="padding: 10px 0 0; color: ${params.brandColor}; font-size: 18px; font-weight: 700; border-top: 1px solid #e2e8f0;">
                ¥${params.totalPrice.toLocaleString()}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Status Notice -->
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 20px; margin-right: 12px;">⏳</span>
        <div>
          <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">確認中</div>
          <div style="font-size: 13px; color: #a16207; line-height: 1.5;">担当者が確認次第、確定のご連絡をいたします。</div>
        </div>
      </div>
    </div>
    
    <!-- iCal Note -->
    <div style="background-color: #e0f2fe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 20px; margin-right: 12px;">📎</span>
        <div>
          <div style="font-weight: 600; color: #0369a1; margin-bottom: 4px;">カレンダーに追加</div>
          <div style="font-size: 13px; color: #0284c7; line-height: 1.5;">添付の.icsファイルをクリックすると予約を追加できます。</div>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">予約の変更・キャンセル</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="text-align: center;">
            <a href="${params.rescheduleUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-right: 8px;">
              日時を変更
            </a>
            <a href="${params.cancelUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f1f5f9; color: #475569; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              キャンセル
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: 'linear-gradient(135deg, ' + params.brandColor + ' 0%, ' + adjustColor(params.brandColor, -20) + ' 100%)',
    headerText: '予約を受け付けました',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl
  });
}

interface CancellationEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  logoUrl?: string;
}

function buildCancellationEmail(params: CancellationEmailParams): string {
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
    logoUrl: params.logoUrl
  });
}

interface RescheduleEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  oldFormattedDate: string;
  oldTime: string;
  newFormattedDate: string;
  newTime: string;
  servicesList: string;
  cancelUrl: string;
  rescheduleUrl: string;
  logoUrl?: string;
}

function buildRescheduleEmail(params: RescheduleEmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      ご予約の日時変更が完了しました。
    </p>
    
    <!-- Change Summary -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="width: 45%; vertical-align: top;">
          <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #991b1b; margin-bottom: 4px;">変更前</div>
            <div style="font-size: 13px; color: #7f1d1d; text-decoration: line-through;">
              ${params.oldFormattedDate}<br>${params.oldTime}〜
            </div>
          </div>
        </td>
        <td style="width: 10%; text-align: center; vertical-align: middle;">
          <span style="font-size: 20px; color: #cbd5e1;">→</span>
        </td>
        <td style="width: 45%; vertical-align: top;">
          <div style="background-color: #dcfce7; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #166534; margin-bottom: 4px;">変更後</div>
            <div style="font-size: 13px; color: #14532d; font-weight: 600;">
              ${params.newFormattedDate}<br>${params.newTime}〜
            </div>
          </div>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">サービス</div>
      <div style="font-size: 14px; color: #334155;">${params.servicesList}</div>
    </div>
    
    <!-- iCal Note -->
    <div style="background-color: #e0f2fe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 20px; margin-right: 12px;">📎</span>
        <div>
          <div style="font-weight: 600; color: #0369a1; margin-bottom: 4px;">カレンダーを更新</div>
          <div style="font-size: 13px; color: #0284c7; line-height: 1.5;">添付の.icsファイルでカレンダーを更新できます。</div>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">さらに変更が必要な場合</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="text-align: center;">
            <a href="${params.rescheduleUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-right: 8px;">
              日時変更
            </a>
            <a href="${params.cancelUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f1f5f9; color: #475569; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              キャンセル
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: 'linear-gradient(135deg, ' + params.brandColor + ' 0%, ' + adjustColor(params.brandColor, -20) + ' 100%)',
    headerText: '日時変更完了',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl
  });
}

interface ReminderEmailParams {
  customerName: string;
  orgName: string;
  brandColor: string;
  formattedDate: string;
  selectedTime: string;
  servicesList: string;
  cancelUrl: string;
  rescheduleUrl: string;
  logoUrl?: string;
}

function buildReminderEmail(params: ReminderEmailParams): string {
  const content = `
    <p style="margin: 0 0 24px; font-size: 15px; color: #334155;">
      ${params.customerName} 様
    </p>
    <p style="margin: 0 0 28px; font-size: 15px; color: #334155; line-height: 1.7;">
      明日のご予約のお知らせです。
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
    
    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">ご予定の変更は</p>
      <a href="${params.rescheduleUrl}" style="display: inline-block; padding: 10px 20px; background-color: ${params.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; margin-right: 8px;">
        日時変更
      </a>
      <a href="${params.cancelUrl}" style="display: inline-block; padding: 10px 20px; background-color: #fef2f2; color: #dc2626; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
        キャンセル
      </a>
    </div>
  `;

  return emailWrapper({
    brandColor: params.brandColor,
    orgName: params.orgName,
    headerBgColor: 'linear-gradient(135deg, ' + params.brandColor + ' 0%, ' + adjustColor(params.brandColor, -20) + ' 100%)',
    headerText: '明日のご予約',
    content,
    showReplyNote: true,
    logoUrl: params.logoUrl
  });
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
  logoUrl?: string;
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

  const content = `
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
      以下の予約がお客様によりキャンセルされました。
    </p>
    
    <!-- Customer Info -->
    <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 12px;">👤 顧客情報</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; color: #78716c; font-size: 13px; width: 80px;">お名前</td>
          <td style="padding: 4px 0; color: #1c1917; font-size: 13px; font-weight: 600;">${params.customerName} 様</td>
        </tr>
        ${params.customerPhone ? `
        <tr>
          <td style="padding: 4px 0; color: #78716c; font-size: 13px;">電話番号</td>
          <td style="padding: 4px 0; color: #1c1917; font-size: 13px;">${params.customerPhone}</td>
        </tr>
        ` : ''}
        ${params.customerEmail ? `
        <tr>
          <td style="padding: 4px 0; color: #78716c; font-size: 13px;">メール</td>
          <td style="padding: 4px 0; color: #1c1917; font-size: 13px;">${params.customerEmail}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Booking Details -->
    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="font-size: 12px; color: #475569; font-weight: 600; margin-bottom: 12px;">📅 キャンセルされた予約</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px; width: 90px;">予約日時</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px; font-weight: 600;">
            ${params.formattedDate} ${params.selectedTime}〜
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">サービス</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px;">${params.servicesList || '（なし）'}</td>
        </tr>
        ${params.optionsList ? `
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">オプション</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px;">${params.optionsList}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">合計金額</td>
          <td style="padding: 4px 0; color: #dc2626; font-size: 16px; font-weight: 700;">
            ¥${params.totalPrice.toLocaleString()}
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Cancellation Info -->
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 0 8px 8px 0;">
      <div style="font-size: 13px; color: #7f1d1d;">
        <strong>キャンセル日時：</strong>${cancelledAtFormatted}
      </div>
    </div>
  `;

  return emailWrapper({
    brandColor: '#ef4444', // Red for cancellation
    orgName: params.orgName,
    headerBgColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    headerText: 'キャンセル通知',
    content,
    showReplyNote: false,
    logoUrl: params.logoUrl
  });
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
  logoUrl?: string;
}

function buildAdminNewBookingEmail(params: AdminNewBookingEmailParams): string {
  const content = `
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
      新しい予約が入りました！
    </p>
    
    <!-- Customer Info -->
    <div style="background-color: #dcfce7; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 12px;">👤 顧客情報</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; color: #15803d; font-size: 13px; width: 80px;">お名前</td>
          <td style="padding: 4px 0; color: #14532d; font-size: 13px; font-weight: 600;">${params.customerName} 様</td>
        </tr>
        ${params.customerPhone ? `
        <tr>
          <td style="padding: 4px 0; color: #15803d; font-size: 13px;">電話番号</td>
          <td style="padding: 4px 0; color: #14532d; font-size: 13px;">${params.customerPhone}</td>
        </tr>
        ` : ''}
        ${params.customerEmail ? `
        <tr>
          <td style="padding: 4px 0; color: #15803d; font-size: 13px;">メール</td>
          <td style="padding: 4px 0; color: #14532d; font-size: 13px;">${params.customerEmail}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Booking Details -->
    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="font-size: 12px; color: #475569; font-weight: 600; margin-bottom: 12px;">📅 予約内容</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px; width: 90px;">予約日時</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px; font-weight: 600;">
            ${params.formattedDate} ${params.selectedTime}〜
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">サービス</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px;">${params.servicesList || '（なし）'}</td>
        </tr>
        ${params.optionsList ? `
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">オプション</td>
          <td style="padding: 4px 0; color: #1e293b; font-size: 13px;">${params.optionsList}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px;">合計金額</td>
          <td style="padding: 4px 0; color: #16a34a; font-size: 16px; font-weight: 700;">
            ¥${params.totalPrice.toLocaleString()}
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
      管理画面から予約を確認・確定してください。
    </p>
  `;

  return emailWrapper({
    brandColor: '#22c55e', // Green for new booking
    orgName: params.orgName,
    headerBgColor: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    headerText: '新規予約',
    content,
    showReplyNote: false,
    logoUrl: params.logoUrl
  });
}

// Helper function to darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));

  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const num = parseInt(color, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

serve(handler);
