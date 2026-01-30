
# ハイブリッド通知システム実装計画

## 概要

顧客のLINE連携状況に応じて、最適な通知チャネルを自動選択するシステムを実装します。

## 現状の課題

```text
┌─────────────────────────────────────────────────────────────┐
│                      現在の通知フロー                        │
├─────────────────────────────────────────────────────────────┤
│  予約送信                                                    │
│     │                                                        │
│     ├─→ send-booking-email (顧客にメール送信)               │
│     │      └─ customerEmail があれば送信                     │
│     │                                                        │
│     └─→ send-booking-notification (LINE送信)                │
│            └─ line_user_id があれば送信                      │
│            └─ なければスキップ（何も通知されない）           │
│                                                              │
│  問題: LINE連携していない顧客に確認・リマインダーが届かない  │
└─────────────────────────────────────────────────────────────┘
```

## 改善後のフロー

```text
┌─────────────────────────────────────────────────────────────┐
│                  ハイブリッド通知フロー                      │
├─────────────────────────────────────────────────────────────┤
│  予約確定/キャンセル/リマインダー                            │
│     │                                                        │
│     ▼                                                        │
│  send-hybrid-notification (新規Edge Function)               │
│     │                                                        │
│     ├─ 顧客にLINE User IDがある？                            │
│     │     │                                                  │
│     │     ├─ YES → LINE通知を送信                            │
│     │     │                                                  │
│     │     └─ NO → メールアドレスがある？                     │
│     │              │                                         │
│     │              ├─ YES → メール通知を送信                 │
│     │              │                                         │
│     │              └─ NO → 通知スキップ                      │
│     │                                                        │
│     └─ 管理者への通知は別途送信（変更なし）                  │
└─────────────────────────────────────────────────────────────┘
```

## 実装内容

### 1. 新規Edge Function: send-hybrid-notification

統合通知関数を作成し、顧客の連絡先に応じて最適なチャネルを選択します。

```typescript
// supabase/functions/send-hybrid-notification/index.ts

interface HybridNotificationRequest {
  bookingId: string;
  notificationType: 'confirmed' | 'cancelled' | 'reminder';
}

// 処理フロー:
// 1. 予約情報と顧客情報を取得
// 2. 顧客のline_user_idをチェック
//    - あり → LINE通知を送信
//    - なし → メールアドレスをチェック
//       - あり → メール通知を送信
//       - なし → スキップ
// 3. 送信結果をレスポンス
```

### 2. 既存コードの修正

#### AdminDashboard / BookingDetailModal
予約ステータス変更時の通知呼び出しを `send-hybrid-notification` に変更

#### useBooking.ts (予約送信時)
予約送信後の顧客通知を `send-hybrid-notification` に統一

### 3. Reply-Toヘッダーの追加

メール送信時に店舗のメールアドレスをReply-Toに設定し、顧客が返信できるようにします。

```typescript
// organizationsテーブルにreply_to_emailカラムを追加
// または profilesテーブルのemailを使用

await resend.emails.send({
  from: `${orgName} <noreply@platform.com>`,
  replyTo: adminEmail,  // 店舗のメールアドレス
  to: [customerEmail],
  subject: "...",
  html: "..."
});
```

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `supabase/functions/send-hybrid-notification/index.ts` | 新規作成 - ハイブリッド通知ロジック |
| `supabase/functions/send-booking-email/index.ts` | Reply-Toヘッダーを追加 |
| `supabase/config.toml` | 新規関数の設定追加 |
| `src/components/BookingDetailModal.tsx` | 通知呼び出しを統合関数に変更 |

## 通知チャネルの優先順位

| 優先度 | チャネル | 条件 |
|--------|----------|------|
| 1 | LINE | `line_user_id` が存在する |
| 2 | メール | `customer_email` が存在する |
| 3 | なし | どちらも存在しない場合はスキップ |

## 技術詳細

### send-hybrid-notification の主要ロジック

```typescript
// 1. 顧客情報を取得
const { data: booking } = await supabase
  .from("bookings")
  .select(`*, customers(id, name, line_user_id, email)`)
  .eq("id", bookingId)
  .single();

// 2. 通知チャネルを決定
const customer = booking.customers;
const hasLine = !!customer?.line_user_id;
const hasEmail = !!booking.customer_email;

let notificationChannel: 'line' | 'email' | 'none' = 'none';
if (hasLine) {
  notificationChannel = 'line';
} else if (hasEmail) {
  notificationChannel = 'email';
}

// 3. チャネルに応じて通知を送信
if (notificationChannel === 'line') {
  // LINE Push Message API を使用
} else if (notificationChannel === 'email') {
  // Resend API を使用
}
```

### メールのReply-To設定

```typescript
// 管理者のメールアドレスを取得
const { data: adminProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('organization_id', booking.organization_id)
  .single();

await resend.emails.send({
  from: `${orgName} <onboarding@resend.dev>`,
  replyTo: adminProfile?.email || undefined,  // 返信先を店舗に設定
  to: [customerEmail],
  // ...
});
```

## ユーザー体験の改善

| シナリオ | Before | After |
|----------|--------|-------|
| LINE連携顧客の予約確定 | LINE通知のみ | LINE通知（変更なし） |
| 非LINE顧客の予約確定 | 通知なし | メール通知を送信 |
| 非LINE顧客の予約リマインダー | 通知なし | メールでリマインダー送信 |
| 顧客がメールに返信 | 返信不可 | 店舗のメールアドレスに届く |
