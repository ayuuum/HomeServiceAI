import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Verify a LINE ID Token using LINE Login's verify endpoint.
 * Returns the decoded payload (sub, name, picture, email, etc.)
 * or throws on verification failure.
 */
async function verifyLineIdToken(
  idToken: string,
  channelId: string
): Promise<{ sub: string; name?: string; picture?: string; email?: string }> {
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[verify-id-token] LINE API error:", response.status, errorBody);
    throw new Error(`ID Token verification failed: ${response.status}`);
  }

  return await response.json();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { organizationId, idToken } = await req.json();

    if (!organizationId || !idToken) {
      return new Response(
        JSON.stringify({ error: "organizationId and idToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get LINE Login Channel ID from environment variable
    const lineLoginChannelId = Deno.env.get("LINE_LOGIN_CHANNEL_ID");
    if (!lineLoginChannelId) {
      console.error("[get-or-create-line-customer] LINE_LOGIN_CHANNEL_ID not configured");
      return new Response(
        JSON.stringify({ error: "LINE Login Channel ID is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the ID Token with LINE's API — this gives us a trusted line_user_id
    console.log("[get-or-create-line-customer] Verifying ID token...");
    const tokenPayload = await verifyLineIdToken(idToken, lineLoginChannelId);
    const lineUserId = tokenPayload.sub;
    const displayName = tokenPayload.name || "LINE User";
    const pictureUrl = tokenPayload.picture || null;

    console.log("[get-or-create-line-customer] Verified LINE user:", lineUserId, displayName);

    // Use service role to bypass RLS for customer creation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find or create customer using the verified LINE user ID
    const { data: customerId, error } = await supabase.rpc('find_or_create_customer', {
      p_organization_id: organizationId,
      p_name: displayName,
      p_line_user_id: lineUserId,
      p_avatar_url: pictureUrl,
    });

    if (error) {
      console.error("[get-or-create-line-customer] find_or_create_customer error:", error);
      throw error;
    }

    // Fetch the full customer data to return to the client
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError) throw fetchError;

    return new Response(
      JSON.stringify({ customer }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[get-or-create-line-customer] Error:", error);

    // Return 401 for token verification failures
    const status = error.message?.includes("verification failed") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
