

# キャンセル時の管理者メール通知機能

## 背景

現在、顧客が予約をキャンセルした場合：
- 顧客へのLINE通知：`send-booking-notification` で送信
- 管理者へのLINE通知：`admin_line_user_id` カラムが未実装のため未対応
- **管理者へのメール通知：未実装**

プロフィールページでは、管理者のメールアドレスは `profiles.email` に保存されているが、キャンセル通知には使用されていない。

---

## 実装方針

### データの取得元

管理者のメールアドレスを取得する方法：
- `profiles` テーブルに `organization_id` と `email` が格納されている
- 予約の `organization_id` から該当組織の管理者プロファイルを検索

### 実装箇所

| ファイル | 変更内容 |
|----------|----------|
| `send-booking-email/index.ts` | `admin_notification` タイプを追加し、管理者向けメールテンプレートを実装 |
| `CancelBookingPage.tsx` | キャンセル成功後に管理者メール通知を呼び出す |

---

## 変更内容

### 1. Edge Function の拡張 (`send-booking-email/index.ts`)

#### 新しいメールタイプの追加

```typescript
interface EmailRequest {
  bookingId: string;
  emailType: 'confirmation' | 'cancellation' | 'reminder' | 'admin_notification';
  adminNotificationType?: 'new_booking' | 'cancelled';
}
```

#### 管理者メールアドレスの取得

```typescript
// organization_idから管理者のプロファイルを取得
const { data: adminProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('organization_id', booking.organization_id)
  .not('email', 'is', null)
  .limit(1)
  .single();
```

#### 管理者向けメールテンプレート

新しいキャンセル通知用のHTMLテンプレートを追加：

```text
件名: 【キャンセル通知】○○様 - ○月○日 ○時〜

内容:
- 顧客名
- 予約日時
- サービス内容
- 合計金額
- キャンセル理由（顧客によるキャンセル）
```

### 2. フロントエンドの更新 (`CancelBookingPage.tsx`)

キャンセル成功後に管理者通知を追加：

```typescript
// 既存: 顧客へのLINE通知
supabase.functions.invoke('send-booking-notification', {
  body: { bookingId: booking.id, notificationType: 'cancelled' }
});

// 新規: 管理者へのメール通知
supabase.functions.invoke('send-booking-email', {
  body: { 
    bookingId: booking.id, 
    emailType: 'admin_notification',
    adminNotificationType: 'cancelled'
  }
});
```

---

## 技術詳細

### キャンセル通知フロー

```text
顧客がキャンセルボタンをクリック
         │
         ▼
  cancel_booking_by_token RPC
  (DBでステータス更新)
         │
         ├──────────────────────┐
         ▼                      ▼
send-booking-notification   send-booking-email
  (顧客LINE通知)              (管理者メール通知)
         │                      │
         ▼                      ▼
   LINE Push API            Resend API
         │                      │
         ▼                      ▼
 line_messagesに記録      管理者にメール送信
```

### 管理者メールテンプレートのデザイン

- ヘッダー: 赤色背景（キャンセル警告色）
- 内容: 
  - キャンセルされた予約の詳細
  - 顧客の連絡先（電話番号・メール）
  - キャンセル日時
- フッター: 組織名

### 送信元アドレス

現在は `onboarding@resend.dev` を使用（本番環境では独自ドメインの設定が必要）

---

## 期待される結果

1. 顧客がキャンセルすると、管理者にメールで即時通知が届く
2. メールには予約詳細と顧客連絡先が含まれる
3. 管理者は迅速に対応（空き枠の再公開など）が可能になる

