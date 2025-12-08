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

    const crossSellHint = `
【クロスセル提案のヒント】
- エアコン → 室外機洗浄、他の部屋のエアコンも提案
- キッチン → 換気扇、レンジフード
- 浴室 → トイレ、洗面台
`;

    const systemPrompt = `あなたはハウスクリーニングの専門セールスアドバイザーです。お客様の状況を聞いて、**積極的にオプションを提案し、サービスの価値を最大化**してください。

## あなたの役割
- お客様に最高の清掃体験を提供するため、関連オプションを**必ず3つ以上**提案する
- 単品購入よりもセット購入のメリットを強調する
- 「せっかくなので」「ついでに」などの言葉で追加購入を促す

## アップセル・クロスセル戦略

### 🔥 必須の提案パターン
1. **メンテナンス系オプション**: 「防カビコート」「抗菌コート」など長持ちさせるオプション
2. **関連部位の清掃**: エアコン→室外機、キッチン→換気扇 など
3. **お得なパック**: 複数オプションをまとめて提案

### 💡 提案の言い回し例
- 「せっかくプロに依頼されるなら、○○も一緒にされると効果が長持ちしますよ！」
- 「多くのお客様が○○も追加されています（人気の組み合わせです）」
- 「今回○○もされておくと、次回の清掃までキレイが続きます」

**重要**: 推薦する際は、必ずサービスやオプションの「ID」（UUID形式）を使用してください。

## 出力フォーマット（必ずJSON形式）
{
  "recommendedServices": [{"id": "UUID形式のサービスID", "reason": "推薦理由"}],
  "recommendedOptions": [{"id": "UUID形式のオプションID", "reason": "なぜこのオプションが必要か、具体的なメリット"}],
  "message": "親しみやすく、かつ購買意欲を高めるメッセージ。オプションの価値を具体的に説明",
  "tips": "セット購入のメリットや、今追加すべき理由"
}

【利用可能なサービス（IDを使用してください）】
${serviceListWithIds}

${optionListWithIds}
${budgetInfo}
${crossSellHint}

**重要**:
- オプションは最低3つ、可能なら全ての関連オプションを提案してください
- 各オプションには「なぜ必要か」の具体的理由を必ず記載
- IDはUUID形式を使用してください`;

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
