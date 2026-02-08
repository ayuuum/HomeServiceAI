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

    // Input validation: organizationId must be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      return new Response(
        JSON.stringify({ error: "Invalid organizationId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation: dates must be valid YYYY-MM-DD format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate)) {
      return new Response(
        JSON.stringify({ error: "Invalid startDate format. Expected YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (endDate && !dateRegex.test(endDate)) {
      return new Response(
        JSON.stringify({ error: "Invalid endDate format. Expected YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch bookings, blocks, and organization in parallel
    let bookingsQuery = supabase
      .from("bookings")
      .select("selected_date, selected_time")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled");

    let blocksQuery = supabase
      .from("schedule_blocks")
      .select("id, block_date, block_time, block_type, title")
      .eq("organization_id", organizationId);

    const orgQuery = supabase
      .from("organizations")
      .select("business_hours")
      .eq("id", organizationId)
      .single();

    if (startDate) {
      bookingsQuery = bookingsQuery.gte("selected_date", startDate);
      blocksQuery = blocksQuery.gte("block_date", startDate);
    }
    if (endDate) {
      bookingsQuery = bookingsQuery.lte("selected_date", endDate);
      blocksQuery = blocksQuery.lte("block_date", endDate);
    }

    const [bookingsResult, blocksResult, orgResult] = await Promise.all([
      bookingsQuery,
      blocksQuery,
      orgQuery,
    ]);

    if (bookingsResult.error) {
      console.error("Error fetching bookings:", bookingsResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch availability" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (blocksResult.error) {
      console.error("Error fetching blocks:", blocksResult.error);
      // Continue without blocks if there's an error
    }

    if (orgResult.error) {
      console.error("Error fetching organization:", orgResult.error);
      // Continue without business hours if there's an error
    }

    // Return only slot counts per date/time (no raw booking data)
    const availability: Record<string, Record<string, number>> = {};

    for (const booking of bookingsResult.data || []) {
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

    // Process blocks: { "2025-01-30": [{ id, time, type, title }] }
    const blocks: Record<string, Array<{ id: string; time: string | null; type: string; title: string | null }>> = {};

    for (const block of blocksResult.data || []) {
      const date = block.block_date;

      if (!blocks[date]) {
        blocks[date] = [];
      }
      blocks[date].push({
        id: block.id,
        time: block.block_time,
        type: block.block_type,
        title: block.title,
      });
    }

    return new Response(
      JSON.stringify({ 
        availability, 
        blocks,
        businessHours: orgResult.data?.business_hours || null
      }),
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
