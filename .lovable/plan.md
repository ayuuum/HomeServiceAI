

# 修正プラン：用語・GMVタイミング・Stripe連携

## 1. 用語の改善

「GMV課金モデル」を以下のように分かりやすい表現に変更します：

| 現在の表現 | 変更後 |
|-----------|-------|
| GMV課金モデル | 売上連動型利用料 / 月次利用料 |
| GMV | 月間売上 |
| プラットフォーム利用料 | サービス利用料（7%） |

**変更対象ファイル:**
- `src/pages/ProfilePage.tsx` - 決済設定タブの説明文
- `src/components/MonthlyBillingReport.tsx` - レポート画面の見出し・説明

## 2. GMV計上タイミングの変更

**現在**: 作業完了時（WorkCompletionModal）に `gmv_included_at` を設定
**変更後**: 予約確定時（status = 'confirmed'）に `gmv_included_at` を設定

### 変更箇所

#### 2.1 予約承認時にGMV計上
`BookingDetailModal.tsx` または `AdminDashboard.tsx` の予約承認処理で：

```typescript
// 予約を confirmed に更新する際
await supabase.from("bookings").update({
  status: "confirmed",
  gmv_included_at: new Date().toISOString(), // ここでGMV計上
  // ...
});
```

#### 2.2 WorkCompletionModalの役割変更
- 作業完了時は売上の「訂正」や「追加料金」の記録用に変更
- `gmv_included_at` は予約確定時に設定済みなので、作業完了では更新しない
- 最終金額（final_amount）と決済方法の記録のみ

#### 2.3 MonthlyBillingReportのクエリ変更
- 対象: `status = 'confirmed'` または `status = 'completed'` で `gmv_included_at IS NOT NULL`
- 金額: `final_amount` があれば使用、なければ `total_price`

## 3. Stripe連携機能の実装

事業者が自社Stripeアカウントを連携するOAuth機能を実装します。

### 3.1 Edge Function: `stripe-connect-oauth`

```typescript
// POST: OAuth認可URLを生成
// - Stripe Connect Standard アカウント用
// - redirect_uri を設定

// GET (callback): OAuthコールバック処理
// - authorization_code を受け取り
// - Stripe APIでアクセストークン取得
// - stripe_account_id を organizations に保存
// - stripe_account_status を 'connected' に更新
```

### 3.2 ProfilePage の決済タブUI

```text
┌─────────────────────────────────────────┐
│ オンライン決済（お客様向け）              │
├─────────────────────────────────────────┤
│ Stripeと連携して、お客様にカード決済を   │
│ 提供できます。                          │
│                                         │
│ 連携状況: 🔴 未連携                      │
│                                         │
│ [Stripeと連携する]  ← OAuth開始ボタン   │
│                                         │
│ ※ Stripeアカウントをお持ちでない場合は、│
│   連携時に新規作成できます。             │
└─────────────────────────────────────────┘
```

連携済みの場合:
```text
│ 連携状況: 🟢 連携済み                    │
│ アカウントID: acct_xxx...               │
│                                         │
│ [連携を解除]                            │
```

## 実装手順

### Step 1: 用語の変更
- `ProfilePage.tsx` の決済設定説明文を修正
- `MonthlyBillingReport.tsx` の見出し・説明を修正

### Step 2: GMVタイミング変更
- 予約承認処理（AdminDashboard/BookingDetailModal）で `gmv_included_at` を設定
- `WorkCompletionModal.tsx` から `gmv_included_at` 設定を削除
- `MonthlyBillingReport.tsx` のクエリを調整

### Step 3: Stripe OAuth連携
- `stripe-connect-oauth` Edge Function を作成
- `ProfilePage.tsx` に連携ボタン・状態表示を追加
- `supabase/config.toml` に設定追加

## 技術的考慮事項

### GMV計上タイミング変更の影響
- 予約確定時点で売上が計上されるため、キャンセル時の処理が重要
- キャンセル時は `gmv_included_at` をnullに戻すか、`gmv_audit_log` で調整記録

### Stripe Connect Standard vs Express
- Standard: 事業者が既存Stripeアカウントを使用（推奨）
- Express: Platformが管理するアカウント（より複雑）
- 今回はStandardを採用（事業者の独立性を重視）

