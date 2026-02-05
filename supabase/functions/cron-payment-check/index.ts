 // =====================================================
 // DEPRECATED: This function is no longer needed in the GMV billing model.
 // The Platform no longer manages payment links - that's the organization's responsibility.
 // Keeping this file for reference.
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
 
   console.log("[cron-payment-check] DEPRECATED: This function is no longer used in the GMV billing model");
 
   return new Response(
     JSON.stringify({
       success: true,
       deprecated: true,
       message: "This cron job is deprecated. Payment management is now handled by organizations directly."
     }),
     { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
   );
 });