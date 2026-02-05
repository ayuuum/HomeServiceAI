# 次のステップ：Stripe決済実装の残りタスク

## 実装完了済み ✓✓✓

| 項目 | ファイル |
|------|----------|
| DBスキーマ（payment_status等） | migration完了 |
| create-checkout-session | Edge Function作成済み |
| stripe-webhook | Edge Function作成済み |
| create-refund | Edge Function作成済み |
| BookingDetailModal決済UI | 承認・再送信・返金ボタン追加済み |
| AdminDashboard バッジ | awaiting_payment表示追加済み |
| 決済完了/キャンセルページ | PaymentSuccessPage, PaymentCancelledPage作成済み |
| **設定ページ「決済」タブ** | **ProfilePage.tsx に追加完了 ✓** |
| **send-hybrid-notification決済通知** | **payment_request/completed/reminder/expired追加完了 ✓** |
| **cron-payment-check** | **Edge Function作成完了 ✓** |
| **STRIPE_WEBHOOK_SECRET** | **Secrets設定完了 ✓** |

---

## 残りタスク（オプション）

### 1. サービス別の事前決済フラグUI（オプション）

**目的**: サービスごとに事前決済を必須にできる

**変更ファイル**: `src/pages/AdminServiceManagement.tsx` / `ServiceFormModal.tsx`

**追加内容**:
- 「このサービスは事前決済を必須にする」チェックボックス

---

### 2. Cron Jobのスケジュール設定（推奨）

**目的**: `cron-payment-check` を定期実行するスケジュール設定

**Supabase Dashboard → SQL Editorで実行**:
```sql
select cron.schedule(
  'payment-check-hourly',
  '0 * * * *', -- 毎時0分に実行
  $$
  select net.http_post(
    url:='https://yfxuqyvsccheqhzjopuj.supabase.co/functions/v1/cron-payment-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeHVxeXZzY2NoZXFoempvcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODk3NzIsImV4cCI6MjA3OTM2NTc3Mn0.yceV0Cnmx81UjOlq0NwdA4k_rg9ZoYczVH9AlxSUs54"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

---

## Stripe Webhook設定（手動作業・必須）

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) を開く
2. 「Add endpoint」をクリック
3. 以下を入力:
   - **Endpoint URL**: `https://yfxuqyvsccheqhzjopuj.supabase.co/functions/v1/stripe-webhook`
   - **Events**: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. 作成後、「Signing secret」（`whsec_xxx`）をコピー
5. ✅ STRIPE_WEBHOOK_SECRET は設定済み

---

## テスト手順

1. 設定ページ → 決済タブ → 「事前決済を有効にする」をON
2. 新規予約を作成
3. 予約詳細 → 「承認して決済リンクを送信」をクリック
4. Stripeテストカード（4242424242424242）で決済
5. 予約ステータスが「確定」に変わることを確認

