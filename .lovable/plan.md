

# 次のステップ：Stripe決済実装の残りタスク

## 実装完了済み ✓

| 項目 | ファイル |
|------|----------|
| DBスキーマ（payment_status等） | migration完了 |
| create-checkout-session | Edge Function作成済み |
| stripe-webhook | Edge Function作成済み |
| create-refund | Edge Function作成済み |
| BookingDetailModal決済UI | 承認・再送信・返金ボタン追加済み |
| AdminDashboard バッジ | awaiting_payment表示追加済み |
| 決済完了/キャンセルページ | PaymentSuccessPage, PaymentCancelledPage作成済み |

---

## 残りタスク一覧

### 1. 設定ページに「決済」タブを追加（必須・優先度高）

**目的**: 管理者が `payment_enabled` を有効化できるUI

**変更ファイル**: `src/pages/ProfilePage.tsx`

**追加内容**:
```text
決済タブ
├── 事前決済を有効にする（トグルスイッチ）
├── 決済リンク有効期限（現在: 72時間）表示
├── プラットフォーム手数料（現在: 7%）表示
└── Webhook URL表示（コピー可能）
    https://yfxuqyvsccheqhzjopuj.supabase.co/functions/v1/stripe-webhook
```

---

### 2. send-hybrid-notification に決済通知タイプを追加（必須）

**目的**: 決済リンク送信・支払い完了・リマインダー・期限切れ通知

**変更ファイル**: `supabase/functions/send-hybrid-notification/index.ts`

**追加する通知タイプ**:

| タイプ | LINE | Email | 用途 |
|--------|------|-------|------|
| `payment_request` | ✓ | ✓ | 決済リンク送信 |
| `payment_completed` | ✓ | ✓ | 支払い完了通知 |
| `payment_reminder` | ✓ | ✓ | 12時間前リマインダー |
| `payment_expired` | ✓ | ✓ | 決済期限切れ通知 |

**追加データ取得**:
- `checkout_url`: Stripeの決済リンク
- `checkout_expires_at`: 期限日時

---

### 3. 決済リマインダーCron追加（必須）

**目的**: 決済期限12時間前にリマインダー送信

**選択肢**:
- A) 既存の `cron-send-reminders` に追加
- B) 新規 `cron-payment-check` を作成（推奨）

**処理フロー**:
```text
1. status = 'awaiting_payment' の予約を取得
2. checkout_expires_at - 12時間 以内のものを抽出
3. payment_reminder_sent_at が NULL のものにリマインダー送信
4. 送信後 payment_reminder_sent_at を更新
```

---

### 4. Stripe Webhook Secret の設定（必須）

**手順**:
1. Stripe Dashboard → Developers → Webhooks
2. 「Add endpoint」をクリック
3. Endpoint URL: `https://yfxuqyvsccheqhzjopuj.supabase.co/functions/v1/stripe-webhook`
4. イベント選択:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
5. 「Add endpoint」で保存
6. 「Signing secret」をコピー（`whsec_xxx...`）
7. Lovable Cloud → Secrets → `STRIPE_WEBHOOK_SECRET` を追加

---

### 5. サービス別の事前決済フラグUI（オプション）

**目的**: サービスごとに事前決済を必須にできる

**変更ファイル**: `src/pages/AdminServiceManagement.tsx` / `ServiceFormModal.tsx`

**追加内容**:
- 「このサービスは事前決済を必須にする」チェックボックス

---

### 6. 決済期限切れ時の管理者通知（オプション）

**目的**: 72時間経過で決済リンクが期限切れになった際、管理者に通知

**処理**:
- Cronで `checkout_expires_at` を過ぎた予約を検出
- `payment_status` を `expired` に更新
- 管理者にメール/通知を送信
- **自動キャンセルはしない**（管理者判断待ち）

---

## 推奨実装順序

```text
Day 1: 
├── タスク4: Stripe Webhook Secret設定（10分）
└── タスク1: 設定ページ「決済」タブ追加

Day 2:
└── タスク2: send-hybrid-notification 決済通知追加

Day 3:
└── タスク3: 決済リマインダーCron追加

Day 4:
├── タスク5: サービス別事前決済フラグ（オプション）
└── タスク6: 期限切れ管理者通知（オプション）

Day 5:
└── E2Eテスト
```

---

## 最初に行うべきこと

### Stripe Webhook設定（手動作業）

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) を開く
2. 「Add endpoint」をクリック
3. 以下を入力:
   - **Endpoint URL**: `https://yfxuqyvsccheqhzjopuj.supabase.co/functions/v1/stripe-webhook`
   - **Events**: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. 作成後、「Signing secret」（`whsec_xxx`）をコピー

その後、Lovableに「STRIPE_WEBHOOK_SECRETを設定して、設定ページに決済タブを追加してください」と依頼してください。

