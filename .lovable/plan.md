

# 予約管理カレンダーのコンパクト化

## 現状分析

| 項目 | 現在の値 | 問題点 |
|------|----------|--------|
| セル最小高さ | `min-h-[140px]` | 6週間で840pxになる |
| 週表示 | 常に5〜6週間表示 | 空白の週も表示される |
| 予約カード | 高さ固定なし | 予約が多い日はセルがさらに縦長に |

## 改善案

### 1. セル高さの削減

```text
変更前: min-h-[140px]（約840px/6週）
変更後: min-h-[100px]（約600px/6週）
```

### 2. 予約カードのコンパクト化

現在の予約カード:
```text
┌─────────────────┐
│ 10:00        ●  │
│ 山田太郎         │
│ エアコンクリーニング │
└─────────────────┘
```

コンパクト化後:
```text
┌─────────────────┐
│ 10:00 山田太郎   │
└─────────────────┘
```

- 時刻と名前を1行に統合
- サービス名は非表示（クリックで詳細確認）
- padding を `p-2` → `p-1.5` に削減

### 3. 予約件数の上限表示

1日に3件以上ある場合は「+N件」と表示し、残りは省略:

```text
┌───────────────────┐
│ 15                │
│ ┌───────────────┐ │
│ │ 10:00 山田    │ │
│ ├───────────────┤ │
│ │ 13:00 鈴木    │ │
│ ├───────────────┤ │
│ │ +2件          │ │
│ └───────────────┘ │
└───────────────────┘
```

### 4. 今日の予約セクションをコンパクト化（オプション）

デフォルトで折りたたみ状態にして、必要な時だけ展開できるようにする

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CalendarPage.tsx` | セル高さ削減、予約カードの1行化、表示件数制限 |

---

## 実装詳細

### セル高さの変更（line 270）

```typescript
// 変更前
className={`min-h-[140px] p-2 bg-card ...`}

// 変更後
className={`min-h-[100px] p-1.5 bg-card ...`}
```

### 予約カードの1行化（lines 291-316）

```typescript
// 変更後：コンパクトな1行表示
<button className="w-full text-left px-2 py-1 rounded ...">
  <div className="flex items-center gap-1.5">
    <span className="font-bold text-xs tabular-nums">
      {booking.selectedTime}
    </span>
    <span className="font-medium text-xs truncate">
      {booking.customerName}
    </span>
    {booking.status === "pending" && (
      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
    )}
  </div>
</button>
```

### 表示件数の制限

```typescript
const displayBookings = dayBookings.slice(0, 2);
const remainingCount = dayBookings.length - 2;

{displayBookings.map((booking) => (
  // 予約カード表示
))}
{remainingCount > 0 && (
  <div className="text-xs text-muted-foreground text-center">
    +{remainingCount}件
  </div>
)}
```

---

## ビフォー・アフター比較

```text
【Before】                      【After】
┌────────────────────┐         ┌────────────────────┐
│ 15            3件  │         │ 15            3件  │
│                    │         │ 10:00 山田        │
│ 10:00          ●  │         │ 13:00 鈴木        │
│ 山田太郎          │         │ +1件              │
│ エアコンクリーニング │         └────────────────────┘
│                    │
│ 13:00             │
│ 鈴木花子          │
│ 水回りクリーニング  │
│                    │
│ 15:00          ●  │
│ 田中一郎          │
│ PCサポート        │
└────────────────────┘
高さ: 約140px              高さ: 約100px
```

---

## 期待される改善

| 指標 | Before | After | 削減率 |
|------|--------|-------|--------|
| セル高さ | 140px | 100px | 約29% |
| カレンダー全体 | 約840px | 約600px | 約29% |
| 予約カード高さ | 約60px | 約28px | 約53% |

これにより、スクロール量が大幅に削減され、月間カレンダー全体を一目で把握しやすくなります。

