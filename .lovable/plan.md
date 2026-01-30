

# メール通知機能 実装計画

## 現状の分析

### 既存の仕組み

| ファイル | 機能 | 送信元アドレス |
|----------|------|----------------|
| `send-booking-email` | 顧客確認メール、管理者通知 | `onboarding@resend.dev`（テスト用） |
| `send-hybrid-notification` | LINE/メールのハイブリッド通知 | `onboarding@resend.dev`（テスト用） |
| `cron-send-reminders` | 予約リマインダー | LINE のみ（メール未対応） |

### 問題点

1. **送信元ドメイン**: `onboarding@resend.dev` はResendのテスト用で、本番利用には不適切
2. **到達率**: 独自ドメインを使わないとスパム判定されやすい
3. **リマインダー**: メールアドレスのみの顧客にリマインダーが届かない

---

## 実装内容

### 変更1: 送信元アドレスの更新

検証済みドメイン `amber-inc.com` を使用して送信元を変更

```text
Before: {店舗名} <onboarding@resend.dev>
After:  {店舗名} <noreply@amber-inc.com>
```

### 変更2: cron-send-remindersにメール対応を追加

LINE連携していない顧客にもリマインダーメールを送信

```text
┌─────────────────────────────────────────────────────────┐
│              リマインダー送信ロジック                    │
├─────────────────────────────────────────────────────────┤
│  予約をチェック                                          │
│     │                                                    │
│     ├─ 顧客にLINE User IDあり？                          │
│     │     └─ YES → LINE通知を送信                        │
│     │                                                    │
│     └─ LINE なし & メールあり？                          │
│           └─ YES → メールリマインダーを送信              │
└─────────────────────────────────────────────────────────┘
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `supabase/functions/send-booking-email/index.ts` | from を `noreply@amber-inc.com` に変更 |
| `supabase/functions/send-hybrid-notification/index.ts` | from を `noreply@amber-inc.com` に変更 |
| `supabase/functions/cron-send-reminders/index.ts` | メールリマインダー機能を追加 |

---

## 技術詳細

### send-booking-email の変更箇所

```typescript
// Line 159, 222 を変更
await resend.emails.send({
  from: `${orgName} <noreply@amber-inc.com>`,  // 変更
  to: [customerEmail],
  // ...
});
```

### send-hybrid-notification の変更箇所

```typescript
// Line 277 を変更
await resend.emails.send({
  from: `${orgName} <noreply@amber-inc.com>`,  // 変更
  reply_to: replyToEmail || undefined,
  to: [booking.customer_email],
  // ...
});
```

### cron-send-reminders へのメール機能追加

```typescript
// 新規追加: Resend インポート
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// リマインダー処理内で
if (lineUserId) {
  // 既存: LINE通知を送信
} else if (customerEmail) {
  // 新規: メールリマインダーを送信
  await sendEmailReminder(booking, org, hoursBefore);
}
```

---

## メールテンプレート一覧

現在実装済みのテンプレート:

| タイプ | 用途 | 送信タイミング |
|--------|------|----------------|
| confirmation | 予約受付確認 | 予約送信時 |
| cancellation | キャンセル完了 | キャンセル時 |
| reminder | リマインダー | 予約前日（cronで送信） |
| admin_notification | 管理者への新規予約/キャンセル通知 | 予約送信/キャンセル時 |
| confirmed | 予約確定通知 | 管理者が承認時 |
| cancelled | 予約キャンセル通知（管理者起因） | 管理者がキャンセル時 |

---

## マルチテナント対応（将来の拡張）

現在は `amber-inc.com` を全組織共通で使用しますが、将来的には組織ごとに独自ドメインを設定可能にできます:

```sql
-- 将来の拡張用カラム
ALTER TABLE organizations ADD COLUMN email_domain text;
-- 例: 'example-cleaning.com'
```

```typescript
// 将来の実装
const emailDomain = org.email_domain || 'amber-inc.com';
from: `${orgName} <noreply@${emailDomain}>`
```

