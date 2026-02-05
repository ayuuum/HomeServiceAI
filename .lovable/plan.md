

# Stripe決済アーキテクチャ変更: STORES型（GMV課金）への移行

## 1. 概要

### 変更概要

| 項目 | 現行 | 新規 |
|------|------|------|
| 顧客の支払い先 | Platform Stripe | 事業者（現金/振込/事業者Stripe） |
| Platform収益 | Connect application_fee | 月次請求（GMV×7%） |
| 売上計上タイミング | 決済完了時 | 予約確定時 |
| 対応決済手段 | カードのみ | 現金・振込・オンライン決済 |

### 影響範囲

```text
[削除/大幅変更]
├── supabase/functions/create-checkout-session/ → 削除
├── supabase/functions/stripe-webhook/ → 大幅変更
├── supabase/functions/create-refund/ → 変更
└── supabase/functions/cron-payment-check/ → 削除

[新規作成]
├── supabase/functions/create-org-checkout/ → 事業者Stripe用
├── supabase/functions/org-stripe-webhook/ → 事業者Stripe webhook
├── supabase/functions/generate-monthly-billing/ → 月次請求生成
├── supabase/functions/platform-stripe-webhook/ → Platform請求webhook
└── supabase/functions/stripe-connect-oauth/ → Stripe OAuth接続

[UI変更]
├── 作業完了画面（売上確定）
├── 月次請求レポート画面
├── Stripe連携設定画面
└── 予約詳細モーダル
```

---

## 2. データベース変更

### 2.1 bookings テーブル拡張

```sql
-- 新規カラム
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_amount INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gmv_included_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS online_payment_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS additional_charges JSONB DEFAULT '[]';

-- payment_method: 'cash' | 'bank_transfer' | 'online_card' | 'other'
-- online_payment_status: 'pending' | 'paid' | 'failed' | 'refunded'

-- 既存カラムの役割変更
-- total_price → 見積金額（予約時）
-- final_amount → 最終金額（作業完了時、GMV計上対象）
```

### 2.2 organizations テーブル拡張

```sql
-- 月次請求用のPlatform Stripe顧客ID
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_payment_method_status TEXT DEFAULT 'not_setup';
-- billing_payment_method_status: 'not_setup' | 'active' | 'expired'

-- 既存カラムの役割変更
-- stripe_account_id → 事業者自身のStripeアカウント（OAuth連携）
-- stripe_account_status → 'not_connected' | 'connected' | 'active'
```

### 2.3 monthly_billing テーブル（新規）

```sql
CREATE TABLE monthly_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  billing_month TEXT NOT NULL, -- 'YYYY-MM' format
  
  -- GMV集計
  gmv_total INTEGER NOT NULL DEFAULT 0,
  gmv_cash INTEGER NOT NULL DEFAULT 0,
  gmv_bank_transfer INTEGER NOT NULL DEFAULT 0,
  gmv_online INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  
  -- 手数料計算
  fee_percent NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  fee_total INTEGER NOT NULL DEFAULT 0,
  
  -- Stripe Invoice
  stripe_invoice_id TEXT,
  invoice_status TEXT DEFAULT 'draft', -- 'draft' | 'issued' | 'paid' | 'overdue' | 'void'
  hosted_invoice_url TEXT,
  
  -- タイムスタンプ
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, billing_month)
);
```

### 2.4 gmv_audit_log テーブル（新規・監査用）

```sql
CREATE TABLE gmv_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  action TEXT NOT NULL, -- 'completed' | 'modified' | 'refunded' | 'cancelled'
  previous_amount INTEGER,
  new_amount INTEGER,
  reason TEXT,
  performed_by UUID, -- auth.uid()
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Edge Function変更

### 3.1 削除するFunction

| Function | 理由 |
|----------|------|
| `create-checkout-session` | Platform経由の決済を廃止 |
| `cron-payment-check` | 決済リンク期限管理が不要に |

### 3.2 新規作成Function

#### 3.2.1 `stripe-connect-oauth`
事業者がStripeアカウントを連携するためのOAuthフロー

```typescript
// POST: OAuth開始URL生成
// GET: OAuth callback処理
// - stripe_account_id を organizations に保存
// - stripe_account_status を 'connected' に更新
```

#### 3.2.2 `create-org-checkout`
事業者Stripeでの顧客向けCheckout Session作成

```typescript
interface Request {
  bookingId: string;
}
// 事業者のstripe_account_idを使用してCheckout生成
// Platform stripe_account_idではなく、事業者自身のアカウント
```

#### 3.2.3 `org-stripe-webhook`
事業者Stripeからのwebhook処理

```typescript
// checkout.session.completed → online_payment_status = 'paid'
// charge.refunded → online_payment_status = 'refunded', GMV調整
```

#### 3.2.4 `generate-monthly-billing`
月次GMV集計・請求書生成（Cronまたは手動実行）

```typescript
// 1. 対象月の completed かつ gmv_included_at IS NOT NULL の bookings を集計
// 2. monthly_billing レコード作成/更新
// 3. Platform Stripe で Invoice 発行
// 4. hosted_invoice_url を保存
```

#### 3.2.5 `platform-stripe-webhook`
Platform Stripe（月次請求）のwebhook処理

```typescript
// invoice.paid → monthly_billing.invoice_status = 'paid'
// invoice.payment_failed → monthly_billing.invoice_status = 'overdue'
```

### 3.3 変更するFunction

#### 3.3.1 `stripe-webhook` → 廃止または最小化
現行のPlatform決済処理を削除、必要に応じて`platform-stripe-webhook`に統合

#### 3.3.2 `send-hybrid-notification`
通知タイプ追加:
- `work_completed` - 作業完了・売上確定通知
- `monthly_billing_issued` - 月次請求発行通知
- `payment_overdue` - 支払い遅延通知

---

## 4. 画面変更

### 4.1 作業完了画面（新規）

予約詳細モーダルに「作業完了」ボタンを追加し、以下を入力:

```text
┌─────────────────────────────────────────┐
│ 作業完了                                 │
├─────────────────────────────────────────┤
│ 最終金額: [¥15,000    ] (デフォルト=見積) │
│                                         │
│ 決済方法: ○ 現金  ○ 振込  ○ カード決済   │
│                                         │
│ 追加料金: [+ 追加項目]                   │
│   ・駐車場代 ¥1,000                     │
│   ・追加作業 ¥2,000                     │
│                                         │
│ [ キャンセル ]        [ 作業完了を確定 ] │
└─────────────────────────────────────────┘
```

**処理内容:**
1. `bookings.final_amount` を更新
2. `bookings.payment_method` を更新
3. `bookings.status = 'completed'` に変更
4. `bookings.gmv_included_at = NOW()` でGMV計上
5. `gmv_audit_log` に記録

### 4.2 月次請求レポート画面（新規または ReportsPage 拡張）

```text
┌─────────────────────────────────────────┐
│ 月次請求レポート        [2026年1月 ▼]    │
├─────────────────────────────────────────┤
│ 今月のGMV                               │
│ ┌─────────────────────────────────────┐ │
│ │ 総売上: ¥1,250,000                  │ │
│ │   現金: ¥800,000 (64%)              │ │
│ │   振込: ¥300,000 (24%)              │ │
│ │   カード: ¥150,000 (12%)            │ │
│ │ 予約件数: 45件                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 手数料 (7%)                             │
│ ┌─────────────────────────────────────┐ │
│ │ 請求額: ¥87,500                     │ │
│ │ ステータス: 🔵 発行済み              │ │
│ │ 支払期限: 2026/02/15                │ │
│ │ [請求書を表示] [支払い履歴]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ GMV明細                                 │
│ ┌─────────────────────────────────────┐ │
│ │ 日付 | 顧客名 | サービス | 金額 | 方法│ │
│ │ 1/5  | 山田様 | エアコン | ¥15,000 |現金│
│ │ 1/6  | 佐藤様 | 浴室    | ¥20,000 |振込│
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 4.3 Stripe連携設定画面（ProfilePage 拡張）

```text
┌─────────────────────────────────────────┐
│ 決済設定                                 │
├─────────────────────────────────────────┤
│ オンライン決済                           │
│ ┌─────────────────────────────────────┐ │
│ │ Stripe連携: 🔴 未連携                │ │
│ │                                     │ │
│ │ お客様にカード決済を提供する場合は、  │ │
│ │ Stripeアカウントを連携してください。  │ │
│ │                                     │ │
│ │ [Stripeと連携する]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 月次請求（プラットフォーム利用料）        │
│ ┌─────────────────────────────────────┐ │
│ │ 請求先メール: admin@example.com      │ │
│ │ 支払い方法: 🔵 設定済み              │ │
│ │ 手数料率: 7%                         │ │
│ │                                     │ │
│ │ [支払い方法を変更]                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 4.4 予約詳細モーダル変更

**変更内容:**
- 「決済リンク送信」ボタン → 「作業完了」ボタンに変更
- 作業完了後は「売上訂正」ボタンを表示
- オンライン決済の場合のみ「決済リンク送信」を表示

---

## 5. 実装フェーズ

### Phase 1: データベース・基盤（1日目）
1. DBマイグレーション（bookings拡張、monthly_billing、gmv_audit_log）
2. TypeScript型定義の更新

### Phase 2: 作業完了フロー（2日目）
1. 作業完了モーダルコンポーネント作成
2. 予約詳細モーダルの更新
3. GMV計上ロジック実装

### Phase 3: 月次請求機能（3日目）
1. `generate-monthly-billing` Edge Function
2. `platform-stripe-webhook` Edge Function
3. monthly_billingのRLSポリシー設定

### Phase 4: 月次レポートUI（4日目）
1. 月次請求レポート画面
2. ReportsPageの拡張

### Phase 5: 事業者Stripe連携（5日目・オプション）
1. `stripe-connect-oauth` Edge Function
2. `create-org-checkout` Edge Function
3. `org-stripe-webhook` Edge Function
4. Stripe連携設定UI

### Phase 6: 既存機能削除・クリーンアップ（6日目）
1. 不要なEdge Function削除
2. 既存UIからの決済リンク機能削除
3. ドキュメント更新

---

## 6. 技術的考慮事項

### 6.1 冪等性
- Stripe webhook処理は `stripe_webhook_events` テーブルで重複防止
- GMV計上は `gmv_included_at` の有無でチェック

### 6.2 監査性
- `gmv_audit_log` で全ての売上変更を記録
- 訂正時は理由を必須入力

### 6.3 未払い制御（MVP後）
- `invoice_status = 'overdue'` の場合、新規予約受付を制限
- 制限解除は `invoice.paid` webhook受信時

### 6.4 返金処理
- オンライン決済返金 → `final_amount` を調整、`gmv_audit_log` に記録
- 現金返金 → 事業者側で処理、システム上は売上訂正として記録

---

## 7. セキュリティ

### 7.1 RLSポリシー

```sql
-- monthly_billing
CREATE POLICY "Users can view their org billing"
  ON monthly_billing FOR SELECT
  USING (organization_id = get_user_organization_id());

-- gmv_audit_log
CREATE POLICY "Users can view their org audit logs"
  ON gmv_audit_log FOR SELECT
  USING (organization_id = get_user_organization_id());
```

### 7.2 Stripe Webhook署名検証
- 全webhookで署名検証を必須化
- 事業者Stripe用と Platform Stripe用で別のwebhook secretを使用

