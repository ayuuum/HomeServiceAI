
# 受信トレイ機能修正計画

## 問題の原因

`line_messages`テーブルに`read_at`カラムが存在しないため、ビルドエラーが発生しています。

**現在のテーブル構造:**
| カラム名 | 型 |
|---------|-----|
| id | uuid |
| organization_id | uuid |
| customer_id | uuid |
| line_user_id | text |
| direction | text |
| message_type | text |
| content | text |
| line_message_id | text |
| sent_at | timestamp |
| created_at | timestamp |

`read_at`カラムは**存在しません**。

## 解決方法

`read_at`カラムをデータベースに追加して、未読管理機能を有効にします。

### 1. データベース変更

**SQLマイグレーション:**
```sql
ALTER TABLE line_messages 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### 2. RLSポリシーの確認

現在のRLSポリシーにはUPDATE権限がないため、`read_at`を更新するためのポリシーを追加します：

```sql
CREATE POLICY "Users can update messages for their organization"
ON line_messages
FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());
```

### 3. TypeScript型の自動更新

マイグレーション後、Supabaseの型定義が自動的に更新され、ビルドエラーが解消されます。

## 変更内容

| 変更対象 | 内容 |
|---------|------|
| データベース | `line_messages`テーブルに`read_at`カラムを追加 |
| RLSポリシー | UPDATE権限のポリシーを追加 |

## 実装後の動作

- 会話リストで未読メッセージ数が表示される
- 会話を開くと、メッセージが既読としてマークされる
- LINEからの新着メッセージはリアルタイムで表示される
