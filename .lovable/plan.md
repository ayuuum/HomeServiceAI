

# LINEプロフィール写真表示 - 実装計画

## 現状分析

### 問題点
TypeScript型定義ファイル（`src/integrations/supabase/types.ts`）が実際のデータベーススキーマと同期していません。

| 項目 | 実際のDB | 型定義ファイル |
|------|----------|---------------|
| `avatar_url`カラム | 存在する | 定義されていない |

### 既存の実装状況

LINE Webhook（`supabase/functions/line-webhook/index.ts`）では、既にLINEプロフィール写真を取得・保存する処理が実装されています：

```text
新規顧客作成時:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ LINE Webhook│ ──→ │ LINE API     │ ──→ │ customers   │
│             │     │ /v2/bot/     │     │ avatar_url  │
└─────────────┘     │ profile/{id} │     └─────────────┘
                    └──────────────┘

既存顧客更新時:
同じ流れでavatar_urlを更新
```

## 解決方法

### 1. ConversationList.tsxの修正

型エラーを回避しながら`avatar_url`を取得できるようにします。

**変更内容：**
- Supabaseクエリで型アサーションを使用
- `avatar_url`フィールドを正しく取得・表示

```typescript
// 修正前
const { data: customers } = await supabase
  .from('customers')
  .select('id, name, avatar_url, line_user_id')  // 型エラー

// 修正後
const { data: customers } = await supabase
  .from('customers')
  .select('id, name, avatar_url, line_user_id')
  .not('line_user_id', 'is', null) as unknown as { 
    data: Array<{
      id: string;
      name: string | null;
      avatar_url: string | null;
      line_user_id: string;
    }> | null;
    error: any;
  };
```

### 2. プロフィール写真の表示確認

既存のUIコードでは、`avatar_url`が存在する場合に画像を表示する処理が既に実装されています：

```tsx
<Avatar className="h-10 w-10 flex-shrink-0">
  {conversation.avatarUrl && (
    <img
      src={conversation.avatarUrl}
      alt={conversation.customerName}
      className="h-full w-full object-cover rounded-full"
    />
  )}
  <AvatarFallback className="bg-[#06C755] text-white text-sm">
    {conversation.customerName.charAt(0)}
  </AvatarFallback>
</Avatar>
```

## 動作フロー

```text
プロフィール写真表示までの流れ:

1. LINEユーザーがメッセージ送信
         ↓
2. Webhook受信 → LINE API でプロフィール取得
         ↓
3. customers.avatar_url に保存
         ↓
4. ConversationList でavatar_url取得
         ↓
5. 受信トレイにプロフィール写真表示
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|---------|
| `src/components/ConversationList.tsx` | 型アサーションを追加してavatar_urlを正しく取得 |

## 技術的注意事項

- `src/integrations/supabase/types.ts`は自動生成ファイルのため直接編集不可
- 型定義は次回のスキーマ同期時に自動更新される予定
- 今回は型アサーションで一時的に回避

## 期待される結果

修正後、受信トレイの会話リストで：
- LINEプロフィール写真がアバターとして表示される
- 写真がない場合は名前の頭文字がフォールバックとして表示される

