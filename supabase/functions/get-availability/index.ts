import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, startDate, endDate } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only fetch date and time - no customer info exposed
    let query = supabase
      .from("bookings")
      .select("selected_date, selected_time")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled");

    if (startDate) {
      query = query.gte("selected_date", startDate);
    }
    if (endDate) {
      query = query.lte("selected_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching availability:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch availability" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only slot counts per date/time (no raw booking data)
    const availability: Record<string, Record<string, number>> = {};
    
    for (const booking of data || []) {
      const date = booking.selected_date;
      const time = booking.selected_time;
      
      if (!availability[date]) {
        availability[date] = {};
      }
      if (!availability[date][time]) {
        availability[date][time] = 0;
      }
      availability[date][time]++;
    }

    return new Response(
      JSON.stringify({ availability }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
