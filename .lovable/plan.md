
# アプリ内通知機能 実装プラン

## 概要

管理者向けに、サービス内で発生したイベント（新規予約リクエスト、LINEメッセージ受信など）を**アプリ内で通知**する機能を追加します。ヘッダーにベルアイコンを配置し、未読件数バッジとドロップダウン形式の通知一覧を表示します。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| 通知ベルアイコン | ヘッダーに配置、未読件数をバッジ表示 |
| 通知ドロップダウン | クリックで最新の通知一覧を表示 |
| 通知種別 | 新規予約・予約キャンセル・LINEメッセージ受信 |
| 既読管理 | 個別/一括で既読に変更可能 |
| リアルタイム更新 | Supabase Realtimeで即座に反映 |
| リンク遷移 | 通知クリックで該当ページへ遷移 |

---

## データベース設計

### 新規テーブル: `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- 通知内容
  type TEXT NOT NULL,           -- 'new_booking', 'booking_cancelled', 'line_message'
  title TEXT NOT NULL,          -- 通知タイトル
  message TEXT,                 -- 詳細メッセージ
  
  -- 関連リソース
  resource_type TEXT,           -- 'booking', 'customer', 'line_message'
  resource_id UUID,             -- 関連するリソースのID
  
  -- 状態管理
  read_at TIMESTAMPTZ,          -- 既読日時（NULLは未読）
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_notifications_org_unread 
  ON notifications (organization_id, read_at) 
  WHERE read_at IS NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org notifications"
  ON notifications FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org notifications"
  ON notifications FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Realtime有効化
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## UI設計

### ヘッダーの通知ベル

```text
┌──────────────────────────────────────────────────────────────┐
│  [Logo] ダッシュボード 顧客管理 予約管理 ...    🔔(3) [Logout] │
└──────────────────────────────────────────────────────────────┘
                                                   ↓ クリック
┌─────────────────────────────────────┐
│  通知                    すべて既読  │
├─────────────────────────────────────┤
│  🔵 新規予約リクエスト              │
│     田中様から予約リクエスト         │
│     2分前                           │
├─────────────────────────────────────┤
│  🔵 LINEメッセージ受信              │
│     佐藤様: 駐車場の件について...    │
│     15分前                          │
├─────────────────────────────────────┤
│  ○ 予約キャンセル                   │
│     山田様が予約をキャンセル         │
│     1時間前                         │
└─────────────────────────────────────┘
```

- 🔵 = 未読（青い丸）
- ○ = 既読（グレーの丸）

---

## コンポーネント構成

```text
src/
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.tsx      # ベルアイコン + バッジ
│   │   ├── NotificationDropdown.tsx  # ドロップダウン一覧
│   │   └── NotificationItem.tsx      # 個別通知アイテム
│   └── AdminHeader.tsx               # ベルを追加
├── hooks/
│   └── useNotifications.ts           # 通知データ取得・リアルタイム購読
└── types/
    └── notification.ts               # 型定義
```

---

## 通知生成タイミング

| イベント | トリガー場所 | 通知内容 |
|----------|-------------|----------|
| 新規予約リクエスト | `useBooking.ts` (submitBooking) | 「○○様から予約リクエストが届きました」 |
| 予約キャンセル（顧客） | `CancelBookingPage.tsx` | 「○○様が予約をキャンセルしました」 |
| LINEメッセージ受信 | `line-webhook` Edge Function | 「○○様からメッセージが届きました」 |

### 通知生成の実装方法

**Option A: Edge Functionから生成**（推奨）
- `line-webhook`で顧客からメッセージを受信した際にnotificationsテーブルにINSERT
- 既存のイベント処理に追加するだけで実装可能

**Option B: Database Triggerで生成**
- bookingsテーブルへのINSERT/UPDATEトリガーで自動生成
- より堅牢だが、複雑になる可能性

---

## 実装詳細

### 1. useNotifications.ts

```typescript
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 初回データ取得
  useEffect(() => {
    fetchNotifications();
    
    // Realtimeサブスクリプション
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  // 既読にする
  const markAsRead = async (id: string) => { ... };
  const markAllAsRead = async () => { ... };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

### 2. NotificationBell.tsx

```typescript
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id);
    // 関連ページへ遷移
    if (notification.resourceType === 'booking') {
      navigate('/admin/calendar');
    } else if (notification.resourceType === 'line_message') {
      navigate('/admin/inbox');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon name="notifications" size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        {/* 通知一覧 */}
      </PopoverContent>
    </Popover>
  );
}
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| **DB Migration** | `notifications` テーブル作成 |
| `src/types/notification.ts` | 型定義（新規） |
| `src/hooks/useNotifications.ts` | 通知取得・リアルタイム購読（新規） |
| `src/components/notifications/NotificationBell.tsx` | ベルアイコン（新規） |
| `src/components/notifications/NotificationDropdown.tsx` | ドロップダウン（新規） |
| `src/components/notifications/NotificationItem.tsx` | 通知アイテム（新規） |
| `src/components/AdminHeader.tsx` | NotificationBellを追加 |
| `src/hooks/useBooking.ts` | 予約送信時に通知生成を追加 |
| `supabase/functions/line-webhook/index.ts` | メッセージ受信時に通知生成 |

---

## 将来の拡張

- 通知設定画面（どの通知を受け取るか選択）
- ブラウザプッシュ通知との連携
- 通知履歴ページ（全件表示）
- 通知の自動削除（30日経過後など）
