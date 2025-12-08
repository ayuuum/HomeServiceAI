import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { userInput, services, options, budget } = await req.json() as RequestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const systemPrompt = `あなたはハウスクリーニングの専門アドバイザーです。お客様の状況を丁寧に聞いて、最適なサービスとオプションを推薦してください。

**重要**: 推薦する際は、必ずサービスやオプションの「ID」（UUID形式）を使用してください。タイトル名ではなくIDを使ってください。

推薦する際は以下のJSON形式で出力してください：
{
  "recommendedServices": [{"id": "UUID形式のサービスID", "reason": "推薦理由"}],
  "recommendedOptions": [{"id": "UUID形式のオプションID", "reason": "推薦理由"}],
  "message": "お客様への説明メッセージ（親しみやすく丁寧に）",
  "tips": "コスト削減のヒントや注意点"
}

【利用可能なサービス（IDを使用してください）】
${serviceListWithIds}

${optionListWithIds}
${budgetInfo}

親しみやすく、専門家として信頼感のある対応を心がけてください。
必ずJSON形式で回答し、IDにはUUID形式の値を使用してください。`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        return new Response(JSON.stringify({ error: "サービス利用制限に達しました。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
