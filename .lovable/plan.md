
# LIFF セットアップガイドの更新

## 背景・ユーザーからの情報

LINEからの公式情報として以下が確認されました：
- LIFFアプリは **LINEログインチャネル** に追加する必要がある（Messaging APIチャネルでは不可）
- LIFFは今後「LINEミニアプリ」ブランドに統合予定
- 新規作成時はLINEミニアプリが推奨されるが、日本・台湾以外では引き続きLIFFを使用
- 既存・今後のLIFFアプリも継続サポート

---

## 現在の実装状況

| 項目 | 状態 |
|------|------|
| LIFF SDK | `@line/liff` v2.27.3 インストール済み |
| マイページ | `/booking/:orgSlug/my-bookings` 実装済み |
| DB設定 | `organizations.line_liff_id` カラム存在 |
| 管理画面 | LINE設定フォームにLIFF ID入力欄あり |

---

## 更新内容

### 1. ドキュメント更新 (`docs/line_integration_guide.md`)

LIFFアプリのセットアップセクションを追加：

```text
## 4. LIFFアプリの設定（顧客向けマイページ）

### 重要：LINEログインチャネルを使用

LIFFアプリはMessaging APIチャネルには追加できません。
必ず **LINEログインチャネル** に追加してください。

> 日本・台湾でサービスを提供する場合は、
> LINEミニアプリでの作成が推奨されています。
> ただし、既存のLIFFアプリも引き続き利用可能です。

### セットアップ手順

1. LINE Developersコンソールで「LINEログイン」チャネルを開く
2. 「LIFF」タブを選択し「追加」をクリック
3. 以下の設定を入力：
   - LIFFアプリ名: 例「予約確認」
   - サイズ: Tall または Full
   - エンドポイントURL: 
     `https://cleaning-booking.lovable.app/booking/nook/my-bookings`
   - Scope: `profile` を有効化
   - ボットリンク機能: On (Aggressive)
4. 作成後に表示される「LIFF ID」をコピー
5. 管理画面 > プロフィール設定 > LINE設定 に LIFF ID を入力して保存

### リッチメニューからの連携

LINE公式アカウントのリッチメニューに以下URLを設定：
`https://liff.line.me/{LIFF_ID}`

これにより、顧客がリッチメニューから予約履歴を確認できます。
```

### 2. 知識ベース/メモリの更新

LIFF設定に関する重要ポイントを記録：
- LIFFはLINEログインチャネルに追加（Messaging APIは不可）
- LINEミニアプリへの移行が将来的に推奨されるが、LIFFも継続サポート

---

## 技術詳細

### チャネル構成（推奨）

```text
LINEプロバイダー
├── LINEログインチャネル
│   ├── Supabase Auth連携用（ユーザー認証）
│   └── LIFFアプリ（マイページ・予約確認）
│
└── Messaging APIチャネル
    └── 管理者からのメッセージ送信・Webhook受信
```

### 現在のコード対応

LIFF機能は `src/pages/liff/MyBookingsPage.tsx` で既に実装済み：
- `liff.init()` でLIFF IDを使用して初期化
- `liff.getProfile()` でLINEユーザー情報を取得
- LINE User IDを使って予約履歴を検索

---

## 期待される結果

- ドキュメントがLINE公式の最新仕様に準拠
- ユーザーが迷わずLIFFアプリを正しく設定可能
- 将来的なLINEミニアプリ移行への備えも記載
