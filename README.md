# Lovable プロジェクトへようこそ

## プロジェクト情報

**URL**: https://lovable.dev/projects/e1287b9f-3586-4ee6-941a-055da8613ca0

## ドキュメント
- [システムアーキテクチャ図](docs/architecture.md)
- [デプロイガイド](docs/deployment.md)
- [LINE連携設定ガイド](docs/line_integration_guide.md)
- [技術スタック](docs/tech_stack.md)

## このコードを編集するには？

アプリケーションを編集する方法はいくつかあります。

### **Lovable を使う**

[Lovable Project](https://lovable.dev/projects/e1287b9f-3586-4ee6-941a-055da8613ca0) にアクセスし、そのままプロンプトを入力するだけです。

Lovable 経由で行った変更は、自動的にこのリポジトリにコミットされます。

### **お好みの IDE を使う**

ローカル環境で作業したい場合は、このリポジトリをクローンして変更を push してください。  
push された変更は Lovable 側にも自動で反映されます。

必要なものは **Node.js と npm** のみです。  
→ [nvm を使ったインストール方法](https://github.com/nvm-sh/nvm#installing-and-updating)

以下の手順に従ってください：

```sh
# Step 1: プロジェクトの Git URL を使ってリポジトリをクローン
git clone <YOUR_GIT_URL>

# Step 2: プロジェクトディレクトリへ移動
cd <YOUR_PROJECT_NAME>

# Step 3: 必要な依存関係をインストール
npm i

# Step 4: 自動リロード＆即時プレビュー付きで開発サーバーを起動
npm run dev
```

### **GitHub 上で直接ファイルを編集する**

- 編集したいファイルに移動
- 右上の「Edit（鉛筆アイコン）」をクリック
- 変更を加えてコミット

### **GitHub Codespaces を使う**

- リポジトリのトップページに移動
- 右上の「Code（緑のボタン）」をクリック
- 「Codespaces」タブを選択
- 「New codespace」をクリックして Codespace 環境を起動
- Codespace 上でファイルを編集し、完了後にコミット＆push

## このプロジェクトで使われている技術

このプロジェクトは以下の技術で構築されています：

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## このプロジェクトをデプロイするには？

[Lovable](https://lovable.dev/projects/e1287b9f-3586-4ee6-941a-055da8613ca0) を開き、  
**Share → Publish** をクリックするだけでデプロイできます。

## Lovable プロジェクトにカスタムドメインを接続できますか？

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
