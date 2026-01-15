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
      throw new Error("Missing authorization header");
    }

    // Verify user and get their organization
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Organization not found");
    }

    const organizationId = profile.organization_id;

    // Get organization's LINE token
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("line_channel_token")
      .eq("id", organizationId)
      .single();

    if (orgError || !org?.line_channel_token) {
      throw new Error("LINE is not configured for this organization");
    }

    const { lineUserId, customerId, message } = await req.json();

    if (!lineUserId || !message) {
      throw new Error("Missing required fields: lineUserId and message");
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
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINE API error:", response.status, errorText);
      throw new Error(`LINE API error: ${errorText}`);
    }

    // Save message to database
    const { error: insertError } = await supabase
      .from("line_messages")
      .insert({
        organization_id: organizationId,
        customer_id: customerId || null,
        line_user_id: lineUserId,
        direction: "outbound",
        message_type: "text",
        content: message,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to save outbound message:", insertError);
      // Don't throw - message was sent successfully
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-line-message error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
