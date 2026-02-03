
# 予約ページで営業時間が反映されない問題の修正

## 問題の原因

現在の実装では、予約ページの日時選択コンポーネントが以下の問題を抱えています：

1. **初期レンダリング時の `TIME_SLOTS` がデフォルト値**
   - `useAvailability` フックの `businessHours` 初期値は `null`
   - `TIME_SLOTS` = `getAllAvailableTimeSlots()` は `null` の場合デフォルトスロット（9:00-17:00）を返す
   - 親コンポーネントから渡される `timeSlots` プロップはこのデフォルト値

2. **`weekTimeSlots` との不整合**
   - `fetchWeekAvailability` が呼ばれると `weekTimeSlots` に正しい営業時間データが入る
   - しかし `timeSlots` プロップ（行の表示に使用）が更新されない場合がある

3. **新しいタブで開いた場合**
   - ダッシュボードから予約ページURLをクリック → 新しいブラウザタブで開く
   - 新しいタブには古いキャッシュもリアルタイム接続もない
   - Edge Functionから新鮮なデータを取得するが、`TIME_SLOTS` の更新が追いつかない

---

## 修正内容

### 1. BookingDateTimeSelection.tsx の修正

`timeSlots` プロップではなく、`weekTimeSlots` データから時間スロットを動的に導出します。

```typescript
// 修正前: 固定の timeSlots プロップを使用
{timeSlots.map((time, timeIdx) => (

// 修正後: weekTimeSlots から動的に時間スロットを取得
const derivedTimeSlots = useMemo(() => {
  // weekTimeSlots から全ての時間スロットを収集
  const allTimes = new Set<string>();
  Object.values(weekTimeSlots).forEach(daySlots => {
    daySlots.forEach(slot => allTimes.add(slot.time));
  });
  
  // timeSlots（デフォルト）をフォールバックとして使用
  if (allTimes.size === 0) return timeSlots;
  
  // ソートして返す
  return Array.from(allTimes).sort();
}, [weekTimeSlots, timeSlots]);

// レンダリング時は derivedTimeSlots を使用
{derivedTimeSlots.map((time, timeIdx) => (
```

### 2. useAvailability.ts の修正

初期ロード時に営業時間を先に取得するためのロジックを追加します。

```typescript
// 組織IDが取得されたら即座に営業時間をフェッチ
useEffect(() => {
  const fetchBusinessHours = async () => {
    if (!organizationId || businessHours) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("get-availability", {
        body: { organizationId },
      });
      
      if (!error && data?.businessHours) {
        setBusinessHours(data.businessHours);
      }
    } catch (err) {
      console.error("Error fetching initial business hours:", err);
    }
  };
  
  fetchBusinessHours();
}, [organizationId]);
```

### 3. 定休日の表示対応

`BookingDateTimeSelection.tsx` で定休日を視覚的に表示：

```typescript
// ヘッダー部分で定休日を表示
{weekDays.map((day, idx) => {
  const dateStr = format(day, "yyyy-MM-dd");
  const isClosed = weekTimeSlots[dateStr]?.length === 0 && !loadingWeek;
  
  return (
    <div className={cn(
      "p-1 text-center border-r last:border-r-0",
      isClosed && "bg-gray-100"
    )}>
      {/* 曜日と日付 */}
      {isClosed && <span className="text-[8px] text-muted-foreground">定休日</span>}
    </div>
  );
})}
```

---

## 修正するファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/components/booking/BookingDateTimeSelection.tsx` | `weekTimeSlots` から時間スロットを導出、定休日表示 |
| `src/hooks/useAvailability.ts` | 初期ロード時の営業時間取得を追加 |

---

## 技術的な詳細

### データフロー（修正後）

```text
1. BookingPage がマウント
   ↓
2. organization.id が取得される
   ↓
3. useAvailability(organization.id) が呼ばれる
   ↓
4. 新しいuseEffect: 営業時間を即座にフェッチ
   ↓
5. businessHours 状態が更新される
   ↓
6. TIME_SLOTS が正しい値で計算される
   ↓
7. BookingDateTimeSelection がレンダリング
   ↓
8. fetchWeekAvailability が呼ばれる
   ↓
9. weekTimeSlots が更新される
   ↓
10. derivedTimeSlots が weekTimeSlots から計算される
   ↓
11. 正しい時間スロットが表示される
```

### 定休日の扱い

- `weekTimeSlots[dateStr]` が空配列 = 定休日
- 時間行には表示されるが、全てのセルが無効化
- ヘッダーに「定休日」ラベルを表示

---

## 影響範囲

- 予約ページ（`/booking/:orgSlug`）
- LIFF予約ページ（`/liff/booking/:orgSlug`）
- 管理画面のカレンダービューは既に対応済み
