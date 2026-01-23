
# 予約完了時の確認メール自動送信機能

## 概要
予約完了時に、顧客のメールアドレスに自動でキャンセルURL付きの確認メールを送信する機能を実装します。

---

## 事前準備：Resend APIキーの取得

メール送信にはResendというサービスを使用します。以下の手順でAPIキーを取得してください。

### ステップ1: Resendアカウント作成
1. https://resend.com にアクセス
2. 「Get Started」をクリックしてアカウントを作成
3. GitHubまたはメールアドレスで登録

### ステップ2: ドメイン設定（本番運用時）
1. ログイン後、左メニューの「Domains」をクリック
2. 「Add Domain」でドメインを追加
3. DNSレコードを設定して認証

**テスト段階では**: `onboarding@resend.dev` という送信元アドレスが使えます（自分のメールにのみ送信可能）

### ステップ3: APIキー取得
1. https://resend.com/api-keys にアクセス
2. 「Create API Key」をクリック
3. 名前を入力（例：「Haukuri Pro」）
4. 生成されたAPIキーをコピー

---

## 実装内容

### 1. 新規Edge Function作成

**ファイル:** `supabase/functions/send-booking-email/index.ts`

予約完了時にメールを送信するEdge Functionを作成します。

機能:
- 予約情報を取得
- キャンセルURL（`/cancel/{token}`）を生成
- Resend APIでHTMLメールを送信
- 送信ログを記録

メール内容:
- 予約日時
- サービス内容
- 合計金額
- キャンセルURL（ワンクリックでキャンセル可能）

### 2. 予約フロー修正

**ファイル:** `src/hooks/useBooking.ts`

`submitBooking`関数で予約作成後にメール送信Edge Functionを呼び出します。

```text
予約作成成功
    ↓
予約IDとメールアドレス確認
    ↓
メールアドレスがあればEdge Function呼び出し
    ↓
メール送信（非同期）
```

### 3. 設定ファイル更新

**ファイル:** `supabase/config.toml`

新しいEdge Functionの設定を追加します。

---

## 技術詳細

### Edge Function（send-booking-email）

```text
リクエスト:
- bookingId: 予約ID
- emailType: 'confirmation' | 'cancellation' | 'reminder'

処理フロー:
1. 予約情報取得（customers, booking_services含む）
2. cancel_tokenからキャンセルURL生成
3. 組織情報取得（店名、ブランドカラー）
4. HTMLメールテンプレート生成
5. Resend API呼び出し
6. 送信結果を返却
```

### メールテンプレート

```text
件名: 【ハウクリPro】ご予約を受け付けました

本文:
━━━━━━━━━━━━━━━━━━━━
{店舗名} 予約確認
━━━━━━━━━━━━━━━━━━━━

{顧客名} 様

ご予約いただきありがとうございます。

■ご予約内容
━━━━━━━━━━━━━━━━━━
日時：{日付} {時間}〜
サービス：{サービス名}
合計金額：¥{金額}
━━━━━━━━━━━━━━━━━━

※現在、ご予約は「確認中」のステータスです。
担当者が確認次第、確定のご連絡をいたします。

■ご予約のキャンセル
以下のリンクからキャンセルできます：
{キャンセルURL}

━━━━━━━━━━━━━━━━━━━━
{店舗名}
━━━━━━━━━━━━━━━━━━━━
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/send-booking-email/index.ts` | 新規作成 - メール送信Edge Function |
| `supabase/config.toml` | 新しい関数の設定追加 |
| `src/hooks/useBooking.ts` | 予約完了時にメール送信呼び出し追加 |

---

## 実装後の動作フロー

```text
[顧客] 予約フォーム入力・送信
         ↓
[システム] 予約データをデータベースに保存
         ↓
[システム] メールアドレスがあれば send-booking-email 呼び出し
         ↓
[Resend] 確認メール送信
         ↓
[顧客] メールを受信
      └→ キャンセルリンクをクリック → /cancel/:token へ
```

---

## 次のステップ

プラン承認後、以下の順序で実装します：

1. **RESEND_API_KEY** シークレットの登録をお願いします
2. Edge Function作成（send-booking-email）
3. useBooking.tsの修正（メール送信呼び出し追加）
4. config.toml更新

**注意**: Resendの無料プランでは月3,000通まで送信可能です。テスト段階では `onboarding@resend.dev` 送信元で自分のメールにのみ送信できます。
