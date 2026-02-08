import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  bookingId: string;
  notificationType: 'confirmed' | 'cancelled' | 'reminder';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Service Role Key verification (server-to-server auth)
  const authHeader = req.headers.get("authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = expectedKey!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, notificationType }: NotificationRequest = await req.json();

    if (!bookingId || !notificationType) {
      return new Response(
        JSON.stringify({ error: "bookingId and notificationType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${notificationType} notification for booking: ${bookingId}`);

    // Fetch booking with customer info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        customers (
          id,
          name,
          line_user_id,
          email,
          phone
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found", details: bookingError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if customer has LINE user ID
    const lineUserId = booking.customers?.line_user_id;
    if (!lineUserId) {
      console.log("Customer has no LINE user ID, skipping LINE notification");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No LINE user ID - notification skipped",
          notificationSent: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization's LINE token
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("line_channel_token, name, admin_line_user_id")
      .eq("id", booking.organization_id)
      .single();

    if (orgError || !org?.line_channel_token) {
      console.log("Organization has no LINE channel token configured");
      return new Response(
        JSON.stringify({
          success: true,
          message: "LINE channel not configured - notification skipped",
          notificationSent: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification message
    const message = buildNotificationMessage(booking, notificationType, org.name);

    // Send LINE message
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
      console.error("LINE API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send LINE message", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the sent message to customer
    await supabase.from("line_messages").insert({
      organization_id: booking.organization_id,
      customer_id: booking.customer_id,
      line_user_id: lineUserId,
      content: message,
      direction: "outbound",
      message_type: "text",
    });

    // --- Admin Notification ---
    if (org.admin_line_user_id && (notificationType === 'confirmed' || notificationType === 'cancelled')) {
      const adminMessage = `【管理通知】新しい${notificationType === 'confirmed' ? '予約' : 'キャンセル'}がありました。\n\n顧客: ${booking.customer_name}様\n日時: ${booking.selected_date} ${booking.selected_time}\n合計: ¥${booking.total_price?.toLocaleString()}`;

      try {
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${org.line_channel_token}`,
          },
          body: JSON.stringify({
            to: org.admin_line_user_id,
            messages: [{ type: "text", text: adminMessage }],
          }),
        });
        console.log(`Successfully sent admin notification to ${org.admin_line_user_id}`);
      } catch (adminErr) {
        console.error("Failed to send admin notification:", adminErr);
      }
    }

    console.log(`Successfully sent ${notificationType} notification to ${lineUserId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        notificationSent: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildNotificationMessage(
  booking: any,
  notificationType: 'confirmed' | 'cancelled' | 'reminder',
  orgName: string | null
): string {
  const dateStr = booking.selected_date;
  const timeStr = booking.selected_time;
  const customerName = booking.customer_name || booking.customers?.name || "お客様";
  const totalPrice = booking.total_price?.toLocaleString() || "0";
  const storeName = orgName || "ハウクリPro";

  switch (notificationType) {
    case 'confirmed':
      return `【${storeName}】ご予約確定のお知らせ

${customerName}様

ご予約が確定いたしました。

📅 ${dateStr} ${timeStr}〜
💰 ${totalPrice}円

当日お伺いいたします。

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

当日お伺いいたします。`;

    default:
      return `【${storeName}】ご予約に関するお知らせ

${customerName}様

ご予約内容: ${dateStr} ${timeStr}〜`;
  }
}
