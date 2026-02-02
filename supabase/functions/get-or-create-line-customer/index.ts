import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    idToken: string;
    organizationId: string;
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { idToken, organizationId }: RequestBody = await req.json();

        if (!idToken || !organizationId) {
            return new Response(
                JSON.stringify({ error: "idToken and organizationId are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client with service role key to bypass RLS
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch organization's LIFF ID to verify the token
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('line_liff_id, name')
            .eq('id', organizationId)
            .single();

        if (orgError || !org) {
            console.error("Organization not found:", orgError);
            return new Response(
                JSON.stringify({ error: "Organization not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Verify ID Token with LINE API
        // Doc: https://developers.line.biz/ja/reference/liff/#verify-id-token
        const liffId = org.line_liff_id;
        if (!liffId) {
            return new Response(
                JSON.stringify({ error: "LIFF ID not configured for this organization" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // The channel ID is the first part of the LIFF ID (e.g., 1234567890-abcd -> 1234567890)
        const channelId = liffId.split('-')[0];

        const verifyResponse = await fetch("https://api.line.me/oauth2/v2.1/verify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                id_token: idToken,
                client_id: channelId,
            }),
        });

        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.text();
            console.error("LINE Token Verification failed:", errorData);
            return new Response(
                JSON.stringify({ error: "Invalid LINE ID Token", details: errorData }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { sub: lineUserId, name: displayName, picture: pictureUrl } = await verifyResponse.json();

        // 3. Get or Create Customer
        // Priority 1: Search by line_user_id
        let { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('line_user_id', lineUserId)
            .eq('organization_id', organizationId)
            .maybeSingle();

        let isNew = false;

        if (!customer) {
            // Priority 2: Not found by LINE ID, create new one
            isNew = true;
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    organization_id: organizationId,
                    name: displayName || "LINEユーザー",
                    line_user_id: lineUserId,
                    avatar_url: pictureUrl,
                })
                .select()
                .single();

            if (createError) {
                console.error("Failed to create customer:", createError);
                return new Response(
                    JSON.stringify({ error: "Failed to create customer" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            customer = newCustomer;
        } else {
            // Update info if existing
            await supabase
                .from('customers')
                .update({
                    name: customer.name || displayName,
                    avatar_url: customer.avatar_url || pictureUrl,
                })
                .eq('id', customer.id);
        }

        return new Response(
            JSON.stringify({ customer, isNew }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("Function error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
