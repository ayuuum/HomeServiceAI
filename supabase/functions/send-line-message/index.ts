import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user and get their organization
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
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
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "組織が見つかりません" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizationId = profile.organization_id;

    // Parse request body - now supports both text and image messages
    const { lineUserId, customerId, message, messageType = 'text', imageUrl } = await req.json();

    // Validate required fields based on message type
    if (!lineUserId) {
      return new Response(JSON.stringify({ error: "lineUserIdは必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messageType === 'text' && !message) {
      return new Response(JSON.stringify({ error: "テキストメッセージにはmessageが必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messageType === 'image' && !imageUrl) {
      return new Response(JSON.stringify({ error: "画像メッセージにはimageUrlが必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =============================================
    // AUTHORIZATION CHECK: Verify customer belongs to user's organization
    // =============================================
    console.log(`Authorization check: lineUserId=${lineUserId}, customerId=${customerId}, organizationId=${organizationId}`);

    if (customerId) {
      // If customerId is provided, verify it belongs to the user's organization
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("organization_id, line_user_id")
        .eq("id", customerId)
        .single();

      if (customerError || !customer) {
        console.error("Customer not found:", customerError);
        return new Response(JSON.stringify({ error: "顧客が見つかりません" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (customer.organization_id !== organizationId) {
        console.error(`Unauthorized: Customer org ${customer.organization_id} !== user org ${organizationId}`);
        return new Response(JSON.stringify({ error: "権限がありません：この顧客はあなたの組織に属していません" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify lineUserId matches the customer's LINE user ID
      if (customer.line_user_id !== lineUserId) {
        console.error(`LINE User ID mismatch: provided=${lineUserId}, customer=${customer.line_user_id}`);
        return new Response(JSON.stringify({ error: "LINE User IDが顧客情報と一致しません" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // If no customerId provided, verify lineUserId belongs to a customer in the user's organization
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, organization_id")
        .eq("line_user_id", lineUserId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (customerError) {
        console.error("Customer lookup error:", customerError);
        return new Response(JSON.stringify({ error: "顧客の確認中にエラーが発生しました" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!customer) {
        console.error(`Unauthorized: No customer with lineUserId=${lineUserId} in org=${organizationId}`);
        return new Response(JSON.stringify({ error: "権限がありません：このLINEユーザーはあなたの組織の顧客ではありません" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Authorization check passed");

    // Get organization's LINE token
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("line_channel_token")
      .eq("id", organizationId)
      .single();

    if (orgError || !org?.line_channel_token) {
      console.error("LINE token not found:", orgError);
      return new Response(JSON.stringify({ error: "LINE連携が設定されていません" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare LINE message based on type
    let lineMessage;
    let contentForDb: string;

    if (messageType === 'image') {
      // LINE requires both originalContentUrl and previewImageUrl for image messages
      lineMessage = {
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl, // Use same URL for preview (LINE will resize it)
      };
      contentForDb = imageUrl;
      console.log(`Sending LINE image message to ${lineUserId}: ${imageUrl}`);
    } else {
      lineMessage = {
        type: "text",
        text: message,
      };
      contentForDb = message;
      console.log(`Sending LINE text message to ${lineUserId}`);
    }

    // Send message via LINE API
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${org.line_channel_token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [lineMessage],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINE API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `LINE APIエラー: ${response.status}`, details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save message to database for audit logging
    const { error: insertError } = await supabase
      .from("line_messages")
      .insert({
        organization_id: organizationId,
        customer_id: customerId || null,
        line_user_id: lineUserId,
        direction: "outbound",
        message_type: messageType,
        content: contentForDb,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to save outbound message:", insertError);
      // Don't return error - message was sent successfully
    }

    console.log(`LINE ${messageType} message sent successfully to ${lineUserId}`);
    return new Response(JSON.stringify({ success: true, messageType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-line-message error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "不明なエラー" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
