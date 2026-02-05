
# 管理者LINE User ID自動登録機能

## 概要

管理者がLINE公式アカウントに特定のキーワードを送信すると、自動的にその送信者のLINE User IDが`admin_line_user_id`として登録される機能を追加します。

## 動作フロー

```text
1. 管理者がLINE公式アカウントを友だち追加
2. 管理者が「管理者登録」とメッセージ送信
3. Webhookがキーワードを検知
4. 送信者のLINE User IDを admin_line_user_id に保存
5. 確認メッセージを管理者に返信
```

## 実装内容

### ファイル: `supabase/functions/line-webhook/index.ts`

メッセージ処理部分に管理者登録ロジックを追加します。

**検知するキーワード:**
- `管理者登録`
- `admin`

**処理内容:**
```typescript
// メッセージ内容が管理者登録キーワードの場合
if (content === "管理者登録" || content.toLowerCase() === "admin") {
  // admin_line_user_id を更新
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ admin_line_user_id: lineUserId })
    .eq("id", org.id);

  if (!updateError) {
    // 確認メッセージを送信
    await sendLineReply(replyToken, "管理者として登録しました！予約通知がこのLINEに届きます。", org.line_channel_token);
  }
  
  // 通常のメッセージ保存はスキップ
  continue;
}
```

**返信メッセージ:**
- 成功時: `✅ 管理者として登録しました！新規予約・キャンセル通知がこのLINEに届きます。`
- 既に登録済み: `ℹ️ このアカウントは既に管理者として登録されています。`

### 追加するヘルパー関数

```typescript
async function sendLineReply(
  replyToken: string,
  message: string,
  channelToken: string
): Promise<boolean> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: message }],
    }),
  });
  return response.ok;
}
```

## UI更新（オプション）

### ファイル: `src/components/LineSettingsForm.tsx`

管理者LINE User ID入力欄のヘルプテキストを更新：

```text
現在: "新規予約やキャンセル時に通知を受け取る管理者のLINE User IDを入力してください。"

更新後: "LINE公式アカウントに「管理者登録」とメッセージを送ると自動設定されます。
または、LINE User IDを直接入力することもできます。"
```

## セキュリティ考慮

- 管理者登録は誰でも実行可能（最初に登録した人が管理者になる）
- 既に管理者が登録されている場合は上書きされる（意図的な設計：管理者変更が可能）
- 上書きを防ぎたい場合は、既存の`admin_line_user_id`がnullの場合のみ更新する条件を追加可能

## 実装手順

1. `line-webhook/index.ts` に `sendLineReply` ヘルパー関数を追加
2. メッセージ処理ループ内に管理者登録キーワード検知ロジックを追加
3. `LineSettingsForm.tsx` のヘルプテキストを更新
4. Edge Functionを再デプロイ
