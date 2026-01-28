

# 予約確認通知機能 - 修正計画

## 現状まとめ

### 動作中の機能
- **予約確定・キャンセル通知**: `send-booking-notification` Edge Functionで実装済み
- **手動リマインダー送信**: `send-booking-reminder` Edge Functionで実装済み
- **LINE メッセージログ**: `line_messages` テーブルに記録

### ビルドエラーの原因
コードが参照している以下のDB構造が存在しない：
1. `organizations.line_reminder_hours_before` カラム
2. `bookings.line_reminder_sent_at` カラム  
3. `broadcasts` テーブル
4. `broadcast_recipients` テーブル

---

## 修正内容

### 1. データベースマイグレーション

#### organizations テーブル拡張
```sql
ALTER TABLE organizations 
ADD COLUMN line_reminder_hours_before integer[] DEFAULT '{24}';
```

#### bookings テーブル拡張
```sql
ALTER TABLE bookings 
ADD COLUMN line_reminder_sent_at timestamptz;
```

#### broadcasts テーブル作成
```sql
CREATE TABLE broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  message text NOT NULL,
  segment_filters jsonb DEFAULT '{}',
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### broadcast_recipients テーブル作成
```sql
CREATE TABLE broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  line_user_id text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

### 2. RLSポリシー設定

各テーブルに組織ベースのアクセス制御を追加

---

## 技術詳細

### 通知フロー図

```text
[管理者操作]
     │
     ▼
┌─────────────────┐
│ 予約ステータス変更 │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ send-booking-notification │
│  (Edge Function)         │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
[顧客通知]  [管理者通知]
    │         │
    ▼         ▼
LINE Push API
    │
    ▼
line_messages に記録
```

### 自動リマインダー（将来対応）

`cron-send-reminders` が存在するが、pg_cron のスケジュール登録が必要

---

## 期待される結果

- ビルドエラーが解消される
- 一斉配信機能（BroadcastPage）が動作する
- リマインダー設定が保存可能になる
- 予約通知が正常に送信される

