 // =====================================================
 // DEPRECATED: This function is no longer used in the GMV billing model.
 // Checkout sessions are now created via the organization's own Stripe account.
 // Keeping this file for reference but it should not be called.
 // =====================================================
 
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   console.log("[create-checkout-session] DEPRECATED: This function is no longer used in the GMV billing model");
 
   return new Response(
     JSON.stringify({ 
       error: "This function is deprecated. Online payments are now handled via the organization's own Stripe account.",
       deprecated: true
     }),
     { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
   );
 });