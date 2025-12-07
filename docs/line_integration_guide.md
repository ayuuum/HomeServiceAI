# LINE連携セットアップガイド

Haukuri ProのLINE連携機能を有効にするための設定手順です。

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

## 完了

これで設定は完了です。
*   ユーザーは予約画面からLINEでログインし、情報を自動入力できます。
*   管理者はLINE公式アカウントを通じて顧客にメッセージを送信できるようになります（別途バックエンド実装が必要な場合があります）。
