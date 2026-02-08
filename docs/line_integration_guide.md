# LINE連携セットアップガイド

Haukuri ProのLINE連携機能を有効にするための設定手順です。

## チャネル構成（推奨）

```
LINEプロバイダー
├── LINEログインチャネル
│   ├── Supabase Auth連携用（ユーザー認証）
│   └── LIFFアプリ（マイページ・予約確認）
│
└── Messaging APIチャネル
    └── 管理者からのメッセージ送信・Webhook受信
```

## 1. LINE Developersの設定

1.  [LINE Developersコンソール](https://developers.line.biz/console/)にログインします。
2.  **プロバイダー**を作成します（例: Haukuri Pro）。
3.  **LINEログイン**チャネルを作成します。
    *   **チャネル名**: ユーザーに表示される名前（例: Haukuri Pro予約）
    *   **アプリタイプ**: ウェブアプリ
4.  **Messaging API**チャネルを作成します（管理者用）。
    *   **チャネル名**: 店舗からのメッセージ送信に使用されます。

## 2. Supabase Authの設定（ユーザー予約用）

1.  Supabaseダッシュボード > **Authentication** > **Providers** を開きます。
2.  **LINE** を選択し、有効化（Enable）します。
3.  LINE Developersで作成した「LINEログイン」チャネルの情報を入力します。
    *   **Channel ID**
    *   **Channel Secret**
4.  Supabaseに表示されている **Callback URL** をコピーします。
5.  LINE Developersの「LINEログイン」チャネル設定 > **LINEログイン設定** > **コールバックURL** に、コピーしたURLを貼り付けます。
6.  「公開」ステータスに変更します。

## 3. 管理画面の設定（事業者用）

1.  Haukuri Proの管理画面 > **店舗管理** を開きます。
2.  対象店舗のカードにある「**LINE設定**」ボタンをクリックします。
3.  LINE Developersの「Messaging API」チャネルの情報を入力します。
    *   **Channel Access Token (長期)**: Messaging API設定タブ > チャネルアクセストークン > 発行
    *   **Channel Secret**: チャネル基本設定タブ
4.  保存すると、Webhook URLが表示されます。これをコピーします。
5.  LINE Developersの「Messaging API」チャネル設定 > **Messaging API設定** > **Webhook URL** に貼り付け、「検証」をクリックして保存します。
6.  **Webhookの利用** をオンにします。

## 4. LIFFアプリの設定（顧客向けマイページ）

### 重要：LINEログインチャネルを使用

LIFFアプリはMessaging APIチャネルには追加できません。
必ず **LINEログインチャネル** に追加してください。

> **注意**: 日本・台湾でサービスを提供する場合は、LINEミニアプリでの作成が推奨されています。
> ただし、既存のLIFFアプリも引き続き利用可能です。

### セットアップ手順

1. LINE Developersコンソールで「**LINEログイン**」チャネルを開く
2. 「**LIFF**」タブを選択し「**追加**」をクリック
3. 以下の設定を入力：
   - **LIFFアプリ名**: 例「予約確認」
   - **サイズ**: Tall または Full
   - **エンドポイントURL**: `https://your-domain.com/booking/{orgSlug}/my-bookings`
     - 本番の公開URL（`VITE_PUBLIC_URL` で設定したドメイン）を使用し、`{orgSlug}` は店舗のスラッグに置き換えてください（例: `nook`）
   - **Scope**: `profile` を有効化
   - **ボットリンク機能**: On (Aggressive)
4. 作成後に表示される「**LIFF ID**」をコピー
5. Haukuri Pro管理画面 > **プロフィール設定** > **LINE設定** に LIFF ID を入力して保存

### リッチメニューからの連携

LINE公式アカウントのリッチメニューに以下URLを設定：

```
https://liff.line.me/{LIFF_ID}
```

これにより、顧客がリッチメニューから予約履歴を確認できます。

## 完了

これで設定は完了です。

*   ユーザーは予約画面からLINEでログインし、情報を自動入力できます。
*   顧客はリッチメニューから予約履歴を確認できます。
*   管理者はLINE公式アカウントを通じて顧客にメッセージを送信できます。
