 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeSecretKey) {
       throw new Error("STRIPE_SECRET_KEY is not configured");
     }
 
     const stripe = new Stripe(stripeSecretKey, {
       apiVersion: "2023-10-16",
     });
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const url = new URL(req.url);
     
     // Handle OAuth callback (GET request with code parameter)
     if (req.method === "GET" && url.searchParams.has("code")) {
       const code = url.searchParams.get("code")!;
       const state = url.searchParams.get("state");
 
       if (!state) {
         throw new Error("Missing state parameter");
       }
 
       // Parse state to get organization_id
       const { organizationId } = JSON.parse(atob(state));
 
       // Exchange authorization code for access token
       const response = await stripe.oauth.token({
         grant_type: "authorization_code",
         code,
       });
 
       const connectedAccountId = response.stripe_user_id;
 
       if (!connectedAccountId) {
         throw new Error("Failed to get connected account ID");
       }
 
       // Update organization with Stripe account info
       const { error: updateError } = await supabase
         .from("organizations")
         .update({
           stripe_account_id: connectedAccountId,
           stripe_account_status: "connected",
           updated_at: new Date().toISOString(),
         })
         .eq("id", organizationId);
 
       if (updateError) {
         console.error("Failed to update organization:", updateError);
         throw new Error("Failed to save Stripe connection");
       }
 
       console.log(`Stripe account ${connectedAccountId} connected for organization ${organizationId}`);
 
       // Redirect back to the settings page
       const redirectUrl = `${url.origin}/admin/profile?stripe_connected=true`;
       return new Response(null, {
         status: 302,
         headers: {
           ...corsHeaders,
           Location: redirectUrl,
         },
       });
     }
 
     // Handle OAuth initiation (POST request)
     if (req.method === "POST") {
       const authHeader = req.headers.get("Authorization");
       if (!authHeader) {
         throw new Error("Missing authorization header");
       }
 
       // Verify JWT and get user
       const supabaseClient = createClient(
         supabaseUrl,
         Deno.env.get("SUPABASE_ANON_KEY")!,
         { global: { headers: { Authorization: authHeader } } }
       );
 
       const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
       if (authError || !user) {
         throw new Error("Unauthorized");
       }
 
       // Get user's organization
       const { data: profile } = await supabase
         .from("profiles")
         .select("organization_id")
         .eq("id", user.id)
         .single();
 
       if (!profile?.organization_id) {
         throw new Error("Organization not found");
       }
 
       const body = await req.text();
       const { redirectUri } = body ? JSON.parse(body) : {};
 
       // Create state parameter with organization ID
       const state = btoa(JSON.stringify({
         organizationId: profile.organization_id,
       }));
 
       // Generate Stripe Connect OAuth URL
       const oauthUrl = stripe.oauth.authorizeUrl({
         response_type: "code",
         client_id: Deno.env.get("STRIPE_CLIENT_ID") || "",
         scope: "read_write",
         redirect_uri: redirectUri || `${supabaseUrl}/functions/v1/stripe-connect-oauth`,
         state,
       });
 
       return new Response(
         JSON.stringify({ url: oauthUrl }),
         {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 200,
         }
       );
     }
 
     // Handle disconnect (DELETE request)
     if (req.method === "DELETE") {
       const authHeader = req.headers.get("Authorization");
       if (!authHeader) {
         throw new Error("Missing authorization header");
       }
 
       const supabaseClient = createClient(
         supabaseUrl,
         Deno.env.get("SUPABASE_ANON_KEY")!,
         { global: { headers: { Authorization: authHeader } } }
       );
 
       const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
       if (authError || !user) {
         throw new Error("Unauthorized");
       }
 
       // Get user's organization
       const { data: profile } = await supabase
         .from("profiles")
         .select("organization_id")
         .eq("id", user.id)
         .single();
 
       if (!profile?.organization_id) {
         throw new Error("Organization not found");
       }
 
       // Clear Stripe connection
       const { error: updateError } = await supabase
         .from("organizations")
         .update({
           stripe_account_id: null,
           stripe_account_status: "not_connected",
           updated_at: new Date().toISOString(),
         })
         .eq("id", profile.organization_id);
 
       if (updateError) {
         throw new Error("Failed to disconnect Stripe");
       }
 
       return new Response(
         JSON.stringify({ success: true }),
         {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 200,
         }
       );
     }
 
     return new Response(
       JSON.stringify({ error: "Method not allowed" }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 405,
       }
     );
   } catch (error) {
     console.error("Stripe Connect OAuth error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 400,
       }
     );
   }
 });