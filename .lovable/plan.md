
# 今日の予約セクションのモバイル最適化

## 現状の問題

```text
【モバイル現状 - 潰れている】
┌─────────────────────────────┐
│ 10:00 山田太郎  ¥15,000 確定 > │  ← 1行に詰め込みすぎ
│      エアコンクリーニング        │
└─────────────────────────────┘
```

## 改善後のデザイン

```text
【モバイル最適化後】
┌─────────────────────────────┐
│ 10:00        確定  ¥15,000  │
│ 山田太郎                  >  │
│ エアコンクリーニング           │
└─────────────────────────────┘
```

## 変更内容

### 1. レスポンシブレイアウト

**モバイル（〜767px）**
- 2段構成: 上段に時刻・ステータス・金額、下段に顧客名・サービス名
- padding を `p-4` → `p-3` に削減
- 時刻サイズを `text-lg` → `text-base` に削減

**デスクトップ（768px〜）**
- 現状維持（横並びレイアウト）

### 2. コンポーネント構造

```text
【モバイルレイアウト】
┌────────────────────────────────────┐
│ ┌──────┐  ┌──────┐  ┌──────────┐   │
│ │時刻   │  │バッジ │  │   金額 > │   │  ← 上段
│ └──────┘  └──────┘  └──────────┘   │
│ ┌────────────────────────────────┐ │
│ │ 顧客名                          │ │  ← 中段
│ │ サービス名                      │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CalendarPage.tsx` | 今日の予約リストのレスポンシブ化 |

---

## 技術詳細

### Lines 192-238: 予約カードのレスポンシブ化

```typescript
// 変更前（横並び1行レイアウト）
<button className="... flex items-center justify-between gap-4">
  <div className="flex items-center gap-4">
    <div className="text-lg font-bold">...</div>
    <div className="flex flex-col">...</div>
  </div>
  <div className="flex items-center gap-3">
    <span className="font-bold">¥{...}</span>
    <Badge>...</Badge>
    <Icon name="chevron_right" />
  </div>
</button>

// 変更後（モバイルで縦積み）
<button className="... p-3 md:p-4">
  {/* モバイル: 上段 - 時刻・ステータス・金額 */}
  <div className="flex md:hidden items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <span className="text-base font-bold tabular-nums">
        {booking.selectedTime}
      </span>
      <Badge>...</Badge>
    </div>
    <div className="flex items-center gap-1">
      <span className="font-bold text-sm">¥{...}</span>
      <Icon name="chevron_right" size={18} />
    </div>
  </div>
  
  {/* モバイル: 下段 - 顧客名・サービス名 */}
  <div className="md:hidden">
    <p className="font-semibold text-sm">{booking.customerName}</p>
    <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
  </div>
  
  {/* デスクトップ: 現状維持の横並び */}
  <div className="hidden md:flex items-center justify-between gap-4">
    ...既存のレイアウト...
  </div>
</button>
```

---

## ビフォー・アフター

```text
【Before - モバイル】              【After - モバイル】
┌─────────────────────┐          ┌─────────────────────┐
│ 10:00 山田太郎      │          │ 10:00  確定  ¥15,000 >│
│ エアコン... ¥15,000 │ ← 潰れる  │ 山田太郎            │
│           確定 >    │          │ エアコンクリーニング  │
└─────────────────────┘          └─────────────────────┘
  読みづらい                        スッキリ整理
```

---

## 期待される改善

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| 情報の視認性 | 1行に詰め込み | 優先順位で整理 | 大幅改善 |
| タップ領域 | 狭い | 広い | タップしやすい |
| padding | 16px固定 | 12px (モバイル) | 15%コンパクト |

これにより、モバイルでも今日の予約が一目で確認でき、タップ操作もしやすくなります。
