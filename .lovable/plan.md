
# send-hybrid-notification Edge Function エラー修正計画

## 問題の概要

Edge Function で `TypeError: Body is unusable` エラーが発生しています。これは Deno の HTTP サーバーが、エラー発生時にリクエストをクローンしようとした際、既に `req.json()` でボディが消費されているために発生します。

## 原因分析

```text
エラーの流れ:
1. リクエスト受信
2. req.json() でボディを消費
3. 何らかのエラー発生
4. Deno サーバーがエラーハンドリングのため Request.clone() を試行
5. ボディが既に消費されているため "Body is unusable" エラー
```

## 修正内容

### ファイル: `supabase/functions/send-hybrid-notification/index.ts`

**変更1: リクエストボディの安全な読み取り**

リクエストボディを読み取る前に、ボディが存在するかチェックし、エラーハンドリングを強化します。

```typescript
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ボディを安全に読み取る
  let body: HybridNotificationRequest;
  try {
    const text = await req.text();
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Request body is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    body = JSON.parse(text);
  } catch (parseError: any) {
    console.error("[send-hybrid-notification] Failed to parse request body:", parseError);
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { bookingId, notificationType, adminNotificationType } = body;
    const checkoutUrl = body.checkoutUrl;
    // ... 残りの処理
```

**変更2: モジュールレベルの Resend 初期化を削除**

現在、5行目で Resend をモジュールレベルで初期化していますが、これは関数内で既にローカルで初期化されているため不要です。

```typescript
// 削除: const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
```

## 修正後のコード構造

```text
send-hybrid-notification/index.ts
├── CORS ヘッダー定義
├── インターフェース定義
├── serve() ハンドラー
│   ├── OPTIONS プリフライト処理
│   ├── ボディの安全な読み取り（try-catch）
│   │   ├── req.text() でテキストとして取得
│   │   ├── 空チェック
│   │   └── JSON.parse() でパース
│   └── メイン処理（try-catch）
│       ├── バリデーション
│       ├── Supabase クライアント初期化
│       ├── 予約データ取得
│       ├── 通知チャネル判定
│       └── LINE/Email 送信
├── sendLineNotification()
├── sendEmailNotification()
├── buildLineMessage()
└── 各種 Email テンプレート関数
```

## 実装手順

1. `req.json()` を `req.text()` + `JSON.parse()` に変更
2. ボディの空チェックを追加
3. JSON パースエラーの適切なハンドリングを追加
4. モジュールレベルの不要な Resend 初期化を削除
5. Edge Function を再デプロイ

## テスト方法

1. 正常なリクエストで通知が送信されることを確認
2. 空のボディでリクエストした場合に 400 エラーが返ることを確認
3. 不正な JSON でリクエストした場合に 400 エラーが返ることを確認
