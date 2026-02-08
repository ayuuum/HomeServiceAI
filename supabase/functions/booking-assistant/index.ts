import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceInfo {
  id: string;
  title: string;
  basePrice: number;
  description: string;
}

interface OptionInfo {
  id: string;
  title: string;
  price: number;
  serviceId: string;
}

interface RequestBody {
  userInput: string;
  services: ServiceInfo[];
  options: OptionInfo[];
  budget?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user using Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message);
      return new Response(JSON.stringify({ error: "認証に失敗しました" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authenticated user:", user.id);

    const { userInput, services, options, budget } = await req.json() as RequestBody;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const openaiChatModel = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini";

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build service list for prompt
    const serviceList = services.map(s => 
      `- ${s.title}: ¥${s.basePrice.toLocaleString()}（${s.description}）`
    ).join('\n');

    // Build options list grouped by service
    const optionsByService = options.reduce((acc, opt) => {
      const service = services.find(s => s.id === opt.serviceId);
      const serviceName = service?.title || '不明';
      if (!acc[serviceName]) acc[serviceName] = [];
      acc[serviceName].push(`${opt.title}（¥${opt.price.toLocaleString()}）`);
      return acc;
    }, {} as Record<string, string[]>);

    const optionList = Object.entries(optionsByService)
      .map(([service, opts]) => `【${service}のオプション】\n${opts.map(o => `  - ${o}`).join('\n')}`)
      .join('\n\n');

    const budgetInfo = budget ? `\n【予算の上限】¥${budget.toLocaleString()}` : '';

    // Build service list with IDs for prompt
    const serviceListWithIds = services.map(s => 
      `- ID: "${s.id}" | ${s.title}: ¥${s.basePrice.toLocaleString()}（${s.description}）`
    ).join('\n');

    // Build options list with IDs grouped by service
    const optionListWithIds = Object.entries(optionsByService)
      .map(([service, opts]) => {
        const serviceOptions = options.filter(o => {
          const svc = services.find(s => s.id === o.serviceId);
          return svc?.title === service;
        });
        return `【${service}のオプション】\n${serviceOptions.map(o => `  - ID: "${o.id}" | ${o.title}（¥${o.price.toLocaleString()}）`).join('\n')}`;
      })
      .join('\n\n');

    const systemPrompt = `あなたはハウスクリーニングの専門アドバイザーです。お客様に最適なサービスとオプションを提案してください。

## ルール
- **簡潔に**: メッセージは3〜4文以内
- **自然な日本語**: 「！」は最小限、落ち着いたトーン
- **オプションは3つ以上**: 関連オプションを積極的に提案
- **サービスとオプションを区別**: recommendedServicesにはサービスのみ、recommendedOptionsにはオプションのみ

## 提案のコツ
- 「せっかくなので」「ついでに」で追加購入を促す
- 長持ち効果やメンテナンスのメリットを伝える

## 出力フォーマット（JSON）
{
  "recommendedServices": [{"id": "サービスのUUID", "reason": "1文で理由"}],
  "recommendedOptions": [{"id": "オプションのUUID", "reason": "1文でメリット"}],
  "message": "3〜4文の簡潔な提案メッセージ",
  "tips": "1文のお得情報"
}

【サービス一覧】
${serviceListWithIds}

【オプション一覧（オプションのみ提案可）】
${optionListWithIds}
${budgetInfo}

**重要**: recommendedOptionsにはオプションIDのみ使用。サービスIDを入れないでください。`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiChatModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "リクエスト制限に達しました。しばらくしてからお試しください。" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "OpenAIの利用枠を超えました。請求設定をご確認ください。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI処理エラーが発生しました" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("booking-assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
