

# 営業時間設定機能 実装プラン

## 現状の課題

現在、時間スロットは以下の箇所でハードコードされています：

- `src/hooks/useAvailability.ts`: `["09:00", "10:00", ... "17:00"]`
- `src/components/admin/WeeklyCalendarView.tsx`: `9:00〜18:00`
- `src/components/booking/BookingDateTimeSelection.tsx`: 同様

これらを事業者が自由に設定できるようにします。

---

## 実装内容

### 1. データベース変更

`organizations` テーブルに営業時間カラムを追加：

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  business_hours jsonb DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "friday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "saturday": {"open": "09:00", "close": "17:00", "is_closed": false},
    "sunday": {"open": null, "close": null, "is_closed": true}
  }'::jsonb;
```

**データ構造：**
```typescript
interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  open: string | null;   // "09:00"
  close: string | null;  // "18:00"
  is_closed: boolean;    // true = 定休日
}
```

---

### 2. 管理画面UI追加

`ProfilePage.tsx` に営業時間設定タブを追加：

**画面イメージ：**
```
┌─────────────────────────────────────────┐
│  営業時間設定                            │
├─────────────────────────────────────────┤
│  月曜日  [09:00 ▼] 〜 [18:00 ▼]  □定休  │
│  火曜日  [09:00 ▼] 〜 [18:00 ▼]  □定休  │
│  水曜日  [09:00 ▼] 〜 [18:00 ▼]  □定休  │
│  木曜日  [09:00 ▼] 〜 [18:00 ▼]  □定休  │
│  金曜日  [09:00 ▼] 〜 [18:00 ▼]  □定休  │
│  土曜日  [09:00 ▼] 〜 [17:00 ▼]  □定休  │
│  日曜日  [----] 〜 [----]        ☑定休  │
├─────────────────────────────────────────┤
│                        [保存] ボタン     │
└─────────────────────────────────────────┘
```

**機能：**
- 曜日ごとに開始・終了時間を選択（30分刻み or 1時間刻み）
- 定休日チェックで終日休業
- 変更は即座に予約カレンダーに反映

---

### 3. 空き状況取得ロジック更新

**`src/hooks/useAvailability.ts` の修正：**

```typescript
// Before: ハードコード
const TIME_SLOTS = ["09:00", "10:00", ...];

// After: 組織の営業時間から動的生成
const generateTimeSlots = (businessHours: BusinessHours, dayOfWeek: string) => {
  const dayHours = businessHours[dayOfWeek];
  if (dayHours.is_closed) return [];
  
  const slots: string[] = [];
  let current = parseTime(dayHours.open);
  const end = parseTime(dayHours.close);
  
  while (current < end) {
    slots.push(formatTime(current));
    current += 60; // 1時間刻み
  }
  return slots;
};
```

---

### 4. Edge Function更新

`get-availability/index.ts` で営業時間を含めてレスポンス：

```typescript
// 組織の営業時間も取得して返却
const { data: org } = await supabase
  .from("organizations")
  .select("business_hours")
  .eq("id", organizationId)
  .single();

return Response.json({
  availability,
  blocks,
  businessHours: org?.business_hours
});
```

---

### 5. 予約カレンダー更新

**`BookingDateTimeSelection.tsx` の修正：**
- 曜日ごとに異なる時間スロットを表示
- 定休日は自動的にブロック表示
- 営業時間外のスロットは表示しない

**`WeeklyCalendarView.tsx`（管理画面）の修正：**
- 組織の営業時間に基づいて時間行を動的生成
- 定休日は背景色を変えて表示

---

### 6. 公開用関数の更新

`get_organization_public` 関数で営業時間も返却：

```sql
CREATE OR REPLACE FUNCTION get_organization_public(org_slug text)
RETURNS TABLE(..., business_hours jsonb)
AS $$
  SELECT ..., business_hours
  FROM organizations
  WHERE slug = org_slug
$$;
```

---

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `organizations` テーブル | `business_hours` カラム追加 |
| `src/pages/ProfilePage.tsx` | 営業時間設定UIを追加 |
| `src/hooks/useAvailability.ts` | 動的タイムスロット生成 |
| `src/components/booking/BookingDateTimeSelection.tsx` | 営業時間対応 |
| `src/components/admin/WeeklyCalendarView.tsx` | 営業時間対応 |
| `supabase/functions/get-availability/index.ts` | 営業時間を返却 |
| `src/integrations/supabase/types.ts` | 型定義（自動更新） |

---

## 追加検討事項

1. **祝日対応**: 特定日の営業時間変更（将来対応可）
2. **複数シフト対応**: 昼休憩など（例: 9:00-12:00, 13:00-18:00）
3. **スロット間隔設定**: 30分/1時間の選択

