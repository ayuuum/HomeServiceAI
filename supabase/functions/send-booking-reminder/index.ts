import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "認証に失敗しました" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(JSON.stringify({ error: "組織が見つかりません" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizationId = profile.organization_id;

    // Parse request
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingIdは必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking with customer info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        customers (
          id,
          name,
          line_user_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "予約が見つかりません" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify booking belongs to user's organization
    if (booking.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: "権限がありません" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check customer has LINE user ID
    const lineUserId = booking.customers?.line_user_id;
    if (!lineUserId) {
      return new Response(JSON.stringify({ error: "この顧客はLINE連携されていません" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization's LINE token and name
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("line_channel_token, name")
      .eq("id", organizationId)
      .single();

    if (orgError || !org?.line_channel_token) {
      return new Response(JSON.stringify({ error: "LINE連携が設定されていません" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build reminder message
    const customerName = booking.customer_name || booking.customers?.name || "お客様";
    const storeName = org.name || "ハウクリPro";
    const totalPrice = booking.total_price?.toLocaleString() || "0";

    const message = `【${storeName}】ご予約リマインダー

${customerName}様

ご予約のリマインダーです。

📅 ${booking.selected_date} ${booking.selected_time}〜
💰 ${totalPrice}円

ご来店をお待ちしております。`;

    // Send via LINE API
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
      return new Response(JSON.stringify({ error: `LINE APIエラー: ${lineResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update reminder sent timestamp
    await supabase
      .from("bookings")
      .update({ line_reminder_sent_at: new Date().toISOString() })
      .eq("id", bookingId);

    // Log message to line_messages
    await supabase.from("line_messages").insert({
      organization_id: organizationId,
      customer_id: booking.customer_id,
      line_user_id: lineUserId,
      direction: "outbound",
      message_type: "text",
      content: message,
      sent_at: new Date().toISOString(),
    });

    console.log(`Manual reminder sent for booking ${bookingId} to ${lineUserId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-booking-reminder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "不明なエラー" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
