
# 予約ページで営業時間が反映されない問題の修正 ✅ 完了

## 修正内容

### 1. useAvailability.ts
- 組織IDが取得されたら即座に営業時間をEdge Functionから取得するuseEffectを追加
- 新しいタブで開いても正しい営業時間が初期ロード時に取得される

### 2. BookingDateTimeSelection.tsx
- `weekTimeSlots` から動的に時間スロットを導出する `derivedTimeSlots` を追加
- 定休日（`weekTimeSlots[dateStr]?.length === 0`）をヘッダーに「定休日」ラベルで表示
- 定休日のセルをグレーアウトして無効化

## データフロー（修正後）

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
6. fetchWeekAvailability が呼ばれる
   ↓
7. weekTimeSlots が更新される
   ↓
8. derivedTimeSlots が weekTimeSlots から計算される
   ↓
9. 正しい時間スロットが表示される
```

## 修正済みファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/hooks/useAvailability.ts` | 初期ロード時の営業時間取得を追加 |
| `src/components/booking/BookingDateTimeSelection.tsx` | `weekTimeSlots` から時間スロットを導出、定休日表示 |
