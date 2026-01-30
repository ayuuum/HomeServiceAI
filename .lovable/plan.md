
# 管理者通知メールアドレス修正計画

## 問題の特定

### 現状の問題

`send-booking-email` Edge Function で管理者メールを取得する際、以下のクエリを使用している：

```typescript
// Line 105-111
const { data: adminProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('organization_id', booking.organization_id)
  .not('email', 'is', null)
  .limit(1)
  .maybeSingle();
```

このクエリには `ORDER BY` が指定されていないため、同じ organization_id に複数のプロフィールが紐づいている場合、どのメールアドレスが返されるかが**不定**になる。

### 根本原因

1つの組織に複数の管理者（プロフィール）が存在する可能性があり、通知先として誰を選ぶかのルールが未定義。

---

## 解決策

### 推奨：organizations テーブルに admin_email カラムを追加

```text
┌─────────────────────────────────────────────────────────────┐
│                    修正アプローチ                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [organizations テーブル]                                    │
│     └─ admin_email カラムを追加（通知送信先）                │
│                                                              │
│  [ProfilePage（設定画面）]                                   │
│     └─ 「通知用メールアドレス」入力フィールドを追加          │
│     └─ 管理者が明示的に設定可能                              │
│                                                              │
│  [Edge Functions]                                            │
│     └─ organizations.admin_email を優先的に使用              │
│     └─ 未設定の場合は profiles から最古のレコードを使用      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 実装内容

### 1. データベース変更

```sql
-- organizations テーブルに admin_email カラムを追加
ALTER TABLE organizations 
ADD COLUMN admin_email text;

-- 既存データのマイグレーション（各組織の最初のプロフィールのメールを設定）
UPDATE organizations o
SET admin_email = (
  SELECT p.email 
  FROM profiles p 
  WHERE p.organization_id = o.id 
    AND p.email IS NOT NULL 
  ORDER BY p.created_at ASC 
  LIMIT 1
);
```

### 2. ProfilePage.tsx の変更

設定画面の「組織設定」タブに通知用メールアドレスの入力フィールドを追加

| 項目 | 内容 |
|------|------|
| ラベル | 通知用メールアドレス |
| 説明文 | 新規予約やキャンセルの通知を受け取るメールアドレス |
| バリデーション | メールアドレス形式チェック |

### 3. Edge Functions の変更

#### send-booking-email/index.ts

```typescript
// Before (Line 104-111)
const { data: adminProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('organization_id', booking.organization_id)
  .not('email', 'is', null)
  .limit(1)
  .maybeSingle();

// After
// 1. まず organization の admin_email を確認
const { data: org } = await supabase
  .from('organizations')
  .select('admin_email')
  .eq('id', booking.organization_id)
  .single();

let adminEmail = org?.admin_email;

// 2. 未設定の場合は profiles から最古のレコードを取得
if (!adminEmail) {
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('organization_id', booking.organization_id)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })  // 最初に作成されたプロフィール
    .limit(1)
    .maybeSingle();
  adminEmail = adminProfile?.email;
}
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| データベース | organizations に admin_email カラム追加 |
| `src/pages/ProfilePage.tsx` | 通知用メールアドレス設定UIを追加 |
| `supabase/functions/send-booking-email/index.ts` | admin_email を優先的に使用するロジックに変更 |
| `src/integrations/supabase/types.ts` | 自動更新（変更不要） |

---

## 期待される動作

| シナリオ | 通知送信先 |
|----------|------------|
| admin_email が設定済み | organizations.admin_email |
| admin_email が未設定 | profiles から最初に作成されたアカウントの email |
| どちらもなし | 通知をスキップ（ログ出力） |

---

## テスト用設定

NAGAREBOSHI（テスト）アカウントの場合：

1. マイグレーション実行後、admin_email に `bbdream11ayumu@gmail.com` を設定
2. 設定画面から「通知用メールアドレス」で確認・変更可能

