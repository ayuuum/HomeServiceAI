import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function getServiceInfo(supabase: any, organizationId: string): Promise<string> {
  const { data: services, error } = await supabase
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

  if (error || !services?.length) {
    return "現在利用可能なサービス情報がありません。";
  }

  return services.map((s: any) => {
    const options = s.service_options?.map((o: any) => 
      `  - ${o.title}: ¥${o.price.toLocaleString()}${o.description ? ` (${o.description})` : ''}`
    ).join('\n') || '';
    
    return `【${s.title}】
カテゴリ: ${s.category}
料金: ¥${s.base_price.toLocaleString()}〜
所要時間: 約${s.duration}分
説明: ${s.description}
${options ? `オプション:\n${options}` : ''}`;
  }).join('\n\n');
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

  // Reverse to get chronological order
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
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
      
      // Save AI response to database
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
    const [serviceInfo, conversationHistory, orgInfo] = await Promise.all([
      getServiceInfo(supabase, organizationId),
      getConversationHistory(supabase, organizationId, lineUserId),
      getOrganizationInfo(supabase, organizationId)
    ]);

    const defaultSystemPrompt = `あなたは「${orgInfo.name}」の専属AIアシスタントです。
ハウスクリーニングサービスを提供するお店のスタッフとして、お客様のLINEメッセージに対応してください。

【重要な役割】
- あなたはこのお店の代表として回答します
- 一般的なAIアシスタントではありません
- サービスや料金の質問には、以下の【利用可能なサービス情報】を基に具体的に回答してください

【対応方針】
- 明るく丁寧な敬語で対応する
- サービスの質問には必ず【利用可能なサービス情報】から回答する
- 予約希望の場合は予約ページへ案内する
- 長すぎる返答は避け、簡潔にまとめる（最大300文字程度）
- 不明な点は「担当スタッフに確認いたします」と伝える

【重要な書式ルール】
- **や##などのMarkdown記法は絶対に使用しないでください（LINEでは正しく表示されません）
- 強調したい場合は【】や「」を使用してください
- 箇条書きは「・」を使用してください
- 絵文字は適度に使用してOKです

【利用可能なサービス情報】
${serviceInfo}

${conversationHistory}`;

    // カスタムプロンプトがある場合は追加指示としてデフォルトに追記する
    let finalSystemPrompt = defaultSystemPrompt;
    if (systemPrompt && systemPrompt.trim()) {
      finalSystemPrompt = `${defaultSystemPrompt}

【追加指示】
${systemPrompt}`;
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "申し訳ございません。ただいま応答できません。";

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
      message: aiMessage 
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
