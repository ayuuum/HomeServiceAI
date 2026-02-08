import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format, addDays, parse } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineAIRequest {
  organizationId: string;
  lineUserId: string;
  customerId: string | null;
  userMessage: string;
  channelToken: string;
  systemPrompt?: string;
  escalationKeywords?: string[];
}

// Tool definitions for Gemini Function Calling
const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "指定された日付の予約可能な時間帯を確認します。お客様が予約希望日を伝えた場合に使用してください。",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "確認したい日付（YYYY-MM-DD形式）。例: 2026-02-10"
          }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_service_info",
      description: "利用可能なサービスの詳細情報を取得します。料金やサービス内容について質問された場合に使用してください。",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "サービスカテゴリでフィルタする場合のカテゴリ名（オプション）"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_url",
      description: "予約ページのURLを取得します。お客様が予約したいと言った場合に使用してください。",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

// Tool execution functions
async function executeCheckAvailability(
  supabase: any,
  organizationId: string,
  date: string
): Promise<string> {
  try {
    const targetDate = parse(date, 'yyyy-MM-dd', new Date());

    // Get existing bookings for the date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('selected_time')
      .eq('organization_id', organizationId)
      .eq('selected_date', date)
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return "空き状況の確認中にエラーが発生しました。";
    }

    // Get schedule blocks for the date
    const { data: blocks, error: blocksError } = await supabase
      .from('schedule_blocks')
      .select('start_time, end_time')
      .eq('organization_id', organizationId)
      .eq('date', date);

    // Define available time slots (9:00 - 18:00)
    const allSlots = [
      "09:00", "10:00", "11:00", "12:00", "13:00",
      "14:00", "15:00", "16:00", "17:00", "18:00"
    ];

    // Filter out booked slots
    const bookedTimes = bookings?.map((b: any) => b.selected_time) || [];
    const blockedTimes = blocks?.flatMap((b: any) => {
      const start = parseInt(b.start_time.split(':')[0]);
      const end = parseInt(b.end_time.split(':')[0]);
      const times = [];
      for (let h = start; h < end; h++) {
        times.push(`${h.toString().padStart(2, '0')}:00`);
      }
      return times;
    }) || [];

    const unavailableTimes = [...bookedTimes, ...blockedTimes];
    const availableSlots = allSlots.filter(slot => !unavailableTimes.includes(slot));

    const formattedDate = format(targetDate, 'M月d日');

    if (availableSlots.length === 0) {
      return `${formattedDate}は予約が埋まっております。別の日程でご検討いただけますでしょうか。`;
    }

    return `${formattedDate}の空き状況です：\n${availableSlots.map(t => `・${t}`).join('\n')}\n\nご希望のお時間はございますか？`;
  } catch (error) {
    console.error("check_availability error:", error);
    return "日付の解析に失敗しました。YYYY-MM-DD形式（例: 2026-02-10）で日付をお伝えください。";
  }
}

async function executeGetServiceInfo(
  supabase: any,
  organizationId: string,
  category?: string
): Promise<string> {
  let query = supabase
    .from('services')
    .select(`
      id,
      title,
      description,
      base_price,
      duration,
      category,
      service_options (title, price, description)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: services, error } = await query;

  if (error || !services?.length) {
    return "現在利用可能なサービス情報がありません。";
  }

  return services.map((s: any) => {
    const options = s.service_options?.map((o: any) =>
      `  ・${o.title}: ¥${o.price.toLocaleString()}${o.description ? ` (${o.description})` : ''}`
    ).join('\n') || '';

    return `【${s.title}】
カテゴリ: ${s.category}
料金: ¥${s.base_price.toLocaleString()}〜
所要時間: 約${s.duration}分
説明: ${s.description}
${options ? `オプション:\n${options}` : ''}`;
  }).join('\n\n');
}

async function executeGetBookingUrl(
  supabase: any,
  organizationId: string
): Promise<string> {
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', organizationId)
    .single();

  if (!org?.slug) {
    return "予約ページのURLを取得できませんでした。";
  }

  const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://haukuri.pro";
  return `ご予約はこちらから承ります：\n${baseUrl}/booking/${org.slug}`;
}

// Execute tool call and return result
async function executeTool(
  supabase: any,
  organizationId: string,
  toolName: string,
  args: any
): Promise<string> {
  switch (toolName) {
    case "check_availability":
      return await executeCheckAvailability(supabase, organizationId, args.date);
    case "get_service_info":
      return await executeGetServiceInfo(supabase, organizationId, args.category);
    case "get_booking_url":
      return await executeGetBookingUrl(supabase, organizationId);
    default:
      return `Unknown tool: ${toolName}`;
  }
}

async function getConversationHistory(supabase: any, organizationId: string, lineUserId: string): Promise<string> {
  const { data: messages, error } = await supabase
    .from('line_messages')
    .select('direction, content, sent_at')
    .eq('organization_id', organizationId)
    .eq('line_user_id', lineUserId)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (error || !messages?.length) {
    return "";
  }

  const history = messages.reverse().map((m: any) => {
    const role = m.direction === 'inbound' ? 'お客様' : 'スタッフ';
    return `${role}: ${m.content}`;
  }).join('\n');

  return `\n\n【最近の会話履歴】\n${history}`;
}

async function getOrganizationInfo(supabase: any, organizationId: string): Promise<{ name: string; welcomeMessage?: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('name, welcome_message')
    .eq('id', organizationId)
    .single();

  return {
    name: org?.name || 'お店',
    welcomeMessage: org?.welcome_message
  };
}

async function sendLineMessage(channelToken: string, lineUserId: string, message: string): Promise<boolean> {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LINE API error:", response.status, errorText);
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Service Role Key verification (server-to-server auth)
  const authHeader = req.headers.get("authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = expectedKey!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
    const openaiChatModel = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: LineAIRequest = await req.json();
    const {
      organizationId,
      lineUserId,
      customerId,
      userMessage,
      channelToken,
      systemPrompt,
      escalationKeywords = ["スタッフ", "人間", "担当者", "クレーム", "苦情"]
    } = body;

    console.log(`Processing AI agent for org: ${organizationId}, user: ${lineUserId}`);

    // Check for escalation keywords
    const shouldEscalate = escalationKeywords.some(keyword =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    if (shouldEscalate) {
      console.log("Escalation triggered - notifying staff");
      const escalationMessage = "ご要望を承りました。担当スタッフが確認次第、ご連絡いたします。しばらくお待ちください。";

      await sendLineMessage(channelToken, lineUserId, escalationMessage);

      await supabase.from('line_messages').insert({
        organization_id: organizationId,
        customer_id: customerId,
        line_user_id: lineUserId,
        direction: 'outbound',
        message_type: 'text',
        content: escalationMessage,
        sent_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        escalated: true,
        message: escalationMessage
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather context
    const [conversationHistory, orgInfo] = await Promise.all([
      getConversationHistory(supabase, organizationId, lineUserId),
      getOrganizationInfo(supabase, organizationId)
    ]);

    // Get today's date for context
    const today = format(new Date(), 'yyyy-MM-dd');

    const defaultSystemPrompt = `あなたは「${orgInfo.name}」の専属AIアシスタントです。
ハウスクリーニングサービスを提供するお店のスタッフとして、お客様のLINEメッセージに対応してください。

【重要な役割】
- あなたはこのお店の代表として回答します
- 一般的なAIアシスタントではありません
- 必要に応じてツールを使用して正確な情報を提供してください

【利用可能なツール】
- check_availability: 特定の日付の空き状況を確認
- get_service_info: サービスの詳細情報を取得
- get_booking_url: 予約ページのURLを取得

【対応方針】
- 明るく丁寧な敬語で対応する
- サービスや料金の質問には get_service_info ツールを使用する
- 予約希望日が伝えられたら check_availability ツールで空き状況を確認する
- 予約したいと言われたら get_booking_url ツールで予約ページを案内する
- 長すぎる返答は避け、簡潔にまとめる（最大300文字程度）
- 不明な点は「担当スタッフに確認いたします」と伝える

【重要な書式ルール】
- **や##などのMarkdown記法は絶対に使用しないでください（LINEでは正しく表示されません）
- 強調したい場合は【】や「」を使用してください
- 箇条書きは「・」を使用してください
- 絵文字は適度に使用してOKです

【本日の日付】
${today}

${conversationHistory}`;

    let finalSystemPrompt = defaultSystemPrompt;
    if (systemPrompt && systemPrompt.trim()) {
      finalSystemPrompt = `${defaultSystemPrompt}\n\n【追加指示】\n${systemPrompt}`;
    }

    // Initial AI request with tools
    let messages: any[] = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: userMessage }
    ];

    let aiMessage = "";
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openaiChatModel,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          tools,
          tool_choice: "auto"
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("OpenAI API error:", aiResponse.status, errorText);

        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "OpenAI rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error(`OpenAI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) {
        throw new Error("No response from AI");
      }

      // Check if AI wants to use a tool
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        console.log(`AI requested ${choice.message.tool_calls.length} tool call(s)`);

        // Add assistant message with tool calls
        messages.push(choice.message);

        // Execute each tool and add results
        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

          console.log(`Executing tool: ${toolName}`, toolArgs);

          const toolResult = await executeTool(supabase, organizationId, toolName, toolArgs);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult
          });
        }

        // Continue the loop to get AI's response with tool results
        continue;
      }

      // No tool calls - we have the final response
      aiMessage = choice.message.content || "申し訳ございません。ただいま応答できません。";
      break;
    }

    if (!aiMessage) {
      aiMessage = "申し訳ございません。処理中にエラーが発生しました。";
    }

    console.log("AI response generated:", aiMessage.substring(0, 100));

    // Send LINE message
    const sent = await sendLineMessage(channelToken, lineUserId, aiMessage);

    if (!sent) {
      throw new Error("Failed to send LINE message");
    }

    // Save AI response to database
    await supabase.from('line_messages').insert({
      organization_id: organizationId,
      customer_id: customerId,
      line_user_id: lineUserId,
      direction: 'outbound',
      message_type: 'text',
      content: aiMessage,
      sent_at: new Date().toISOString()
    });

    console.log("AI response sent and saved successfully");

    return new Response(JSON.stringify({
      success: true,
      message: aiMessage,
      toolsUsed: iterations > 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("line-ai-agent error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
