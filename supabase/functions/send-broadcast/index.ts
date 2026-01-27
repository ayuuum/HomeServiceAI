import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    const { broadcastId } = await req.json();

    if (!broadcastId) {
      return new Response(JSON.stringify({ error: "broadcastIdは必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch broadcast
    const { data: broadcast, error: broadcastError } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(JSON.stringify({ error: "配信が見つかりません" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify broadcast belongs to user's organization
    if (broadcast.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: "権限がありません" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify broadcast is in sendable state
    if (broadcast.status !== 'draft' && broadcast.status !== 'sending') {
      return new Response(JSON.stringify({ error: "この配信は送信できない状態です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization's LINE token
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("line_channel_token")
      .eq("id", organizationId)
      .single();

    if (orgError || !org?.line_channel_token) {
      return new Response(JSON.stringify({ error: "LINE連携が設定されていません" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update broadcast status to sending
    await supabase
      .from("broadcasts")
      .update({ status: 'sending' })
      .eq("id", broadcastId);

    // Fetch pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("broadcast_recipients")
      .select("id, customer_id, line_user_id")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");

    if (recipientsError) {
      throw recipientsError;
    }

    console.log(`Sending broadcast ${broadcastId} to ${recipients?.length || 0} recipients`);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of (recipients || [])) {
      try {
        // Send LINE push message
        const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${org.line_channel_token}`,
          },
          body: JSON.stringify({
            to: recipient.line_user_id,
            messages: [{ type: "text", text: broadcast.message }],
          }),
        });

        if (!lineResponse.ok) {
          const errorText = await lineResponse.text();
          throw new Error(`LINE API Error: ${lineResponse.status} ${errorText}`);
        }

        // Update recipient status
        await supabase
          .from("broadcast_recipients")
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq("id", recipient.id);

        // Log to line_messages
        await supabase.from("line_messages").insert({
          organization_id: organizationId,
          customer_id: recipient.customer_id,
          line_user_id: recipient.line_user_id,
          direction: "outbound",
          message_type: "text",
          content: broadcast.message,
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${recipient.line_user_id}:`, err);

        // Update recipient status with error
        await supabase
          .from("broadcast_recipients")
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          })
          .eq("id", recipient.id);

        failedCount++;
      }

      // Rate limit: small delay between sends
      await delay(100);
    }

    // Update broadcast with final status
    await supabase
      .from("broadcasts")
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", broadcastId);

    console.log(`Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      sentCount,
      failedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-broadcast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "不明なエラー" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
