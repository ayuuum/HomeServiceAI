

# 営業時間変更が反映されない問題の修正

## 問題の原因

### 1. キャッシュの問題
`useAvailability.ts` には `weekAvailabilityCache` があり、一度取得した営業時間データをキャッシュしています。管理画面で営業時間を変更しても、このキャッシュがクリアされないため、古いデータが表示され続けます。

### 2. リアルタイム更新の欠如
現在、`bookings` と `schedule_blocks` テーブルの変更は監視していますが、`organizations` テーブルの `business_hours` 変更は監視していません。

### 3. React Query キャッシュの問題
営業時間保存後に `refreshOrganization()` を呼んでいますが、これは `useAvailability` のキャッシュには影響しません。

---

## 修正内容

### 1. BusinessHoursSettings.tsx の修正

保存成功時に React Query のキャッシュを無効化し、関連するクエリを再取得させます。

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

const handleSave = async () => {
  // ... existing save logic ...
  
  if (!error) {
    // Clear all availability-related caches
    queryClient.invalidateQueries({ queryKey: ["availability"] });
    queryClient.invalidateQueries({ queryKey: ["businessHours"] });
  }
};
```

### 2. useAvailability.ts の修正

`organizations` テーブルの変更を監視するリアルタイムサブスクリプションを追加します。

```typescript
// Add realtime subscription for organization changes
useEffect(() => {
  if (!organizationId) return;

  const organizationChannel = supabase
    .channel(`organization-hours-${organizationId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "organizations",
        filter: `id=eq.${organizationId}`,
      },
      () => {
        // Clear cache and refetch when organization is updated
        clearWeekCache();
        setBusinessHours(null);
        fetchMonthAvailability(currentMonth);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(organizationChannel);
  };
}, [organizationId, currentMonth, fetchMonthAvailability, clearWeekCache]);
```

### 3. clearWeekCache の拡張

キャッシュクリア時に `businessHours` もリセットするようにします。

```typescript
const clearWeekCache = useCallback(() => {
  setWeekAvailabilityCache({});
  setBusinessHours(null); // Also reset business hours
}, []);
```

### 4. 管理画面のカレンダービュー対応

`WeeklyCalendarView.tsx` でも営業時間変更時にデータを再取得するようにします。

---

## 修正するファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/components/BusinessHoursSettings.tsx` | React Query キャッシュ無効化を追加 |
| `src/hooks/useAvailability.ts` | organizations テーブルのリアルタイム監視を追加、clearWeekCache を拡張 |

---

## 技術的な詳細

### キャッシュ無効化のフロー

```text
管理者が営業時間を変更
        ↓
BusinessHoursSettings で保存
        ↓
Supabase の organizations テーブル更新
        ↓
リアルタイムイベント発火
        ↓
useAvailability が検知
        ↓
weekAvailabilityCache をクリア
        ↓
新しいデータを Edge Function から取得
        ↓
UI が更新される
```

### 影響範囲

- 予約ページ（お客様向け）
- 管理画面のカレンダービュー
- LIFF 予約ページ

すべての画面で、営業時間変更後にリアルタイムで反映されるようになります。

