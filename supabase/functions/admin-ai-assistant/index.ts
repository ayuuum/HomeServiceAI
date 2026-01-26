import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin AI Assistant request:", { message: message.substring(0, 100) });

    // Fetch business data for context
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Fetch current month bookings
    const { data: currentMonthBookings } = await supabase
      .from("bookings")
      .select(`
        *,
        booking_services (service_title, service_quantity, service_base_price),
        booking_options (option_title, option_price, option_quantity)
      `)
      .gte("selected_date", startOfMonth.toISOString().split("T")[0])
      .order("created_at", { ascending: false });

    // Fetch last month bookings for comparison
    const { data: lastMonthBookings } = await supabase
      .from("bookings")
      .select("id, total_price, status")
      .gte("selected_date", startOfLastMonth.toISOString().split("T")[0])
      .lte("selected_date", endOfLastMonth.toISOString().split("T")[0]);

    // Fetch customers
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch services
    const { data: services } = await supabase
      .from("services")
      .select("id, title, base_price, category")
      .eq("is_active", true);

    // Calculate statistics
    const confirmedBookings = currentMonthBookings?.filter(b => b.status === "confirmed") || [];
    const pendingBookings = currentMonthBookings?.filter(b => b.status === "pending") || [];
    const cancelledBookings = currentMonthBookings?.filter(b => b.status === "cancelled") || [];
    
    const currentMonthRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const lastMonthConfirmed = lastMonthBookings?.filter(b => b.status === "confirmed") || [];
    const lastMonthRevenue = lastMonthConfirmed.reduce((sum, b) => sum + (b.total_price || 0), 0);
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : "N/A";

    // Service popularity analysis
    const serviceCount: Record<string, number> = {};
    confirmedBookings.forEach(booking => {
      const bookingServices = booking.booking_services || [];
      bookingServices.forEach((bs: { service_title: string; service_quantity: number }) => {
        serviceCount[bs.service_title] = (serviceCount[bs.service_title] || 0) + bs.service_quantity;
      });
    });
    
    const sortedServices = Object.entries(serviceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Build context for AI
    const businessContext = `
## 現在のビジネスデータ

### 今月の概要 (${today.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })})
- 確定済み予約: ${confirmedBookings.length}件
- 承認待ち予約: ${pendingBookings.length}件
- キャンセル: ${cancelledBookings.length}件
- 今月の売上: ¥${currentMonthRevenue.toLocaleString()}
- 前月比成長率: ${revenueGrowth}%

### 人気サービスTOP5
${sortedServices.length > 0 
  ? sortedServices.map(([name, count], i) => `${i + 1}. ${name}: ${count}件`).join("\n")
  : "データなし"}

### 顧客情報
- 総顧客数: ${customers?.length || 0}名
- 今月の新規顧客: ${customers?.filter(c => new Date(c.created_at) >= startOfMonth).length || 0}名

### 提供中のサービス
${services?.map(s => `- ${s.title} (¥${s.base_price.toLocaleString()})`).join("\n") || "サービスなし"}

### 最近の予約詳細 (直近5件)
${confirmedBookings.slice(0, 5).map(b => {
  const serviceNames = (b.booking_services || []).map((bs: { service_title: string }) => bs.service_title).join(", ");
  return `- ${new Date(b.selected_date).toLocaleDateString("ja-JP")}: ${serviceNames} - ¥${b.total_price?.toLocaleString()}`;
}).join("\n") || "予約なし"}
`;

    const systemPrompt = `あなたはビジネス管理AIアシスタントです。クリーニング予約サービスの管理者をサポートします。

以下のビジネスデータを基に、管理者からの質問に日本語で回答してください。

${businessContext}

## 回答のガイドライン
- データに基づいた具体的な数値を含めてください
- 改善提案がある場合は積極的に提案してください
- 絵文字を適度に使って読みやすくしてください
- 簡潔かつ分かりやすく回答してください
- マークダウン形式で整形してください`;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("AI response streaming started");

    // Return the streaming response
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Admin AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
