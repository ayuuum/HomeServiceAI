# ハウスクリーニング予約システム（Haukuri Pro）

React + Vite + Supabase で構築された予約管理アプリケーションです。

## ドキュメント

- [システムアーキテクチャ図](docs/architecture.md)
- [デプロイガイド](docs/deployment.md)
- [LINE連携設定ガイド](docs/line_integration_guide.md)
- [技術スタック](docs/tech_stack.md)
- [セキュリティ・認証・インフラ](docs/security.md)

## 開発の始め方

必要なものは **Node.js と npm** です。  
→ [nvm を使ったインストール方法](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# リポジトリをクローン
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 依存関係をインストール
npm install

# 環境変数を設定（.env.example を参照）
# AI 機能を使う場合は Supabase Dashboard > Edge Functions > Secrets に OPENAI_API_KEY を設定してください

# 開発サーバーを起動
npm run dev
```

AI 機能（LINE AI エージェント・予約アシスタント・管理画面 AI）を使用する場合は、Supabase Edge Functions 用に **OPENAI_API_KEY** を設定してください。詳細は [デプロイガイド](docs/deployment.md) を参照してください。

## 技術スタック

- **Frontend**: Vite, TypeScript, React, React Router
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase（PostgreSQL, Auth, Storage, Edge Functions）
- **AI**: OpenAI API（チャット補完・Function Calling）

## デプロイ

[デプロイガイド](docs/deployment.md) を参照してください。
