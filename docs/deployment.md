# Haukuri Pro Deployment Guide

このアプリケーションは **Vite + React** で構築されており、バックエンドには **Supabase** を使用しています。
最も簡単かつ推奨されるデプロイ先は **Vercel** ですが、Netlifyなどの他の静的ホスティングサービスでも動作します。

## 前提条件

1.  **GitHubリポジトリ**: ソースコードがGitHubにプッシュされていること。
2.  **Vercelアカウント**: [Vercel](https://vercel.com)のアカウント作成（GitHub連携推奨）。
3.  **Supabaseプロジェクト**: 本番用のSupabaseプロジェクトがセットアップされていること。

## 手順 1: 環境変数の準備

デプロイする前に、以下の環境変数を控えておいてください。これらはSupabaseのダッシュボード（Settings > API）から確認できます。

*   `VITE_SUPABASE_URL`: SupabaseのプロジェクトURL
*   `VITE_SUPABASE_ANON_KEY`: SupabaseのAnon (public) Key

> **注意**: `VITE_` プレフィックスがついている環境変数のみが、ブラウザ側のアプリケーションからアクセス可能です。

## 手順 2: Vercelへのデプロイ（推奨）

1.  **Vercelダッシュボードへアクセス**: [New Project](https://vercel.com/new) をクリックします。
2.  **リポジトリのインポート**: GitHub上の `cleaning-booking-1`（またはリポジトリ名）を選択し、Importをクリックします。
3.  **プロジェクト設定**:
    *   **Framework Preset**: `Vite` が自動選択されているはずです。
    *   **Root Directory**: `./` (デフォルトのまま)
    *   **Build Command**: `npm run build` (または `vite build`)
    *   **Output Directory**: `dist`
4.  **環境変数の設定 (Environment Variables)**:
    *   `Environment Variables` セクションを展開します。
    *   以下の2つを追加します：
        *   NAME: `VITE_SUPABASE_URL`, VALUE: `あなたのSupabase URL`
        *   NAME: `VITE_SUPABASE_ANON_KEY`, VALUE: `あなたのSupabase Anon Key`
5.  **デプロイ**: `Deploy` ボタンをクリックします。

数分待つと、ビルドが完了し、自動的にURL（例: `https://your-project.vercel.app`）が発行されます。

## 手順 3: SupabaseのURL設定

デプロイが完了し、本番URL（例: `https://haukuri-pro.vercel.app`）が発行されたら、Supabase側でも設定が必要です。

1.  Supabaseのダッシュボードへ行きます。
2.  **Authentication > URL Configuration** を開きます。
3.  **Site URL** に、発行された本番URLを入力します。
4.  **Redirect URLs** にも、必要に応じて `https://your-project.vercel.app/**` を追加します（認証リダイレクト用）。

## 手順 4: 動作確認

発行されたURLにアクセスし、以下の点を確認してください。

*   ページが正常に表示されるか。
*   ログイン/サインアップが機能するか（Supabaseとの接続確認）。
*   予約データの読み込み・書き込みができるか。

## トラブルシューティング

*   **画面が真っ白になる**: ブラウザの開発者ツール(F12)のConsoleを確認してください。環境変数が設定されていない場合、Supabaseへの接続エラーが表示されます。
*   **404エラー（リロード時）**: VercelはデフォルトでSPA（シングルページアプリケーション）のリライト設定を行いますが、もしリロード時に404になる場合は、プロジェクトルートに `vercel.json` を作成し、以下の設定を追加してください。

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
