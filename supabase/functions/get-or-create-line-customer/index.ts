 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const { organizationId, lineUserId, profile } = await req.json();
 
     if (!organizationId || !lineUserId) {
       return new Response(
         JSON.stringify({ error: "organizationId and lineUserId are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Use find_or_create_customer function
     const { data: customerId, error } = await supabase.rpc('find_or_create_customer', {
       p_organization_id: organizationId,
       p_name: profile?.displayName || 'LINE User',
       p_line_user_id: lineUserId,
       p_avatar_url: profile?.pictureUrl || null,
     });
 
     if (error) {
       console.error("[get-or-create-line-customer] Error:", error);
       throw error;
     }
 
     // Fetch the customer data
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
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });