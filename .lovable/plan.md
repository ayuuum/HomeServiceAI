
# 通知から該当ページへの直接遷移機能

## 概要

通知をクリックした際に、関連する予約詳細やLINE会話を直接開けるようにします。

## 現状の動作

| 通知タイプ | 現在の遷移先 | 問題点 |
|-----------|-------------|--------|
| 新規予約 | `/admin/calendar` | カレンダーページが開くだけで、該当予約を探す必要がある |
| キャンセル | `/admin/calendar` | 同上 |
| LINEメッセージ | `/admin/inbox` | 受信トレイが開くだけで、該当会話を探す必要がある |

## 改善後の動作

| 通知タイプ | 改善後の遷移 | 動作 |
|-----------|-------------|------|
| 新規予約 | `/admin/calendar?bookingId=xxx` | 予約詳細モーダルが自動で開く |
| キャンセル | `/admin/calendar?bookingId=xxx` | 同上 |
| LINEメッセージ | `/admin/inbox?customerId=xxx` | 該当顧客の会話が自動で選択される |

## 実装内容

### 1. NotificationBell.tsx - URLパラメータの追加

```typescript
// 修正後のナビゲーション処理
const handleNotificationClick = (notification: Notification) => {
  if (!notification.read_at) {
    markAsRead(notification.id);
  }

  switch (notification.resource_type) {
    case "booking":
      if (notification.resource_id) {
        navigate(`/admin/calendar?bookingId=${notification.resource_id}`);
      } else {
        navigate("/admin/calendar");
      }
      break;
    case "line_message":
    case "customer":
      if (notification.resource_id) {
        navigate(`/admin/inbox?customerId=${notification.resource_id}`);
      } else {
        navigate("/admin/inbox");
      }
      break;
    default:
      navigate("/admin");
  }
};
```

### 2. CalendarPage.tsx - 予約詳細の自動表示

```typescript
// useSearchParams を追加
import { useSearchParams } from "react-router-dom";

// コンポーネント内で
const [searchParams, setSearchParams] = useSearchParams();

// bookings取得後に該当予約を自動選択
useEffect(() => {
  const bookingId = searchParams.get("bookingId");
  if (bookingId && bookings.length > 0) {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking) {
      setSelectedBooking(targetBooking);
      setIsModalOpen(true);
      // パラメータをクリア
      setSearchParams({});
    }
  }
}, [bookings, searchParams]);
```

### 3. InboxPage.tsx - 会話の自動選択

```typescript
// useSearchParams を追加
import { useSearchParams } from "react-router-dom";

// コンポーネント内で
const [searchParams, setSearchParams] = useSearchParams();

// 顧客IDからcustomer情報を取得して会話を自動選択
useEffect(() => {
  const customerId = searchParams.get("customerId");
  if (customerId) {
    // 顧客情報を取得して会話を選択
    supabase
      .from("customers")
      .select("id, name, line_user_id")
      .eq("id", customerId)
      .single()
      .then(({ data }) => {
        if (data && data.line_user_id) {
          handleSelectConversation({
            customerId: data.id,
            customerName: data.name || "不明",
            lineUserId: data.line_user_id
          });
        }
      });
    setSearchParams({});
  }
}, [searchParams]);
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/notifications/NotificationBell.tsx` | resource_idをURLパラメータとして付加 |
| `src/pages/CalendarPage.tsx` | bookingIdパラメータで予約詳細モーダルを自動表示 |
| `src/pages/InboxPage.tsx` | customerIdパラメータで会話を自動選択 |

## ユーザー体験の改善

1. **新規予約通知** → クリック → 予約詳細モーダルが即座に開く
2. **キャンセル通知** → クリック → キャンセルされた予約の詳細が開く
3. **LINEメッセージ通知** → クリック → その顧客との会話画面が開く
