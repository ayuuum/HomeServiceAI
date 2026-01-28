
# カレンダーのモバイル最適化

## 現状の問題

| 項目 | 問題点 |
|------|--------|
| セル幅 | 375px ÷ 7 = 約53px（テキストが収まらない） |
| 予約カード | 時刻＋名前を1行に入れようとして潰れる |
| 件数バッジ | スペースを圧迫している |

## 改善内容

### 1. レスポンシブ対応の追加

**モバイル（〜767px）**
- 時刻のみ表示（名前は省略）
- 件数バッジを非表示
- セル高さを `min-h-[80px]` に削減

**タブレット以上（768px〜）**
- 現状維持（時刻＋名前表示）

### 2. 予約カードの改善

```text
【モバイル表示】         【デスクトップ表示】
┌─────────┐            ┌────────────────┐
│ 15      │            │ 15        3件   │
│ 10:00   │            │ 10:00 山田     │
│ 13:00   │            │ 13:00 鈴木     │
│ +1      │            │ +1件           │
└─────────┘            └────────────────┘
  約53px                   約100px以上
```

### 3. コード変更

**セル高さ（レスポンシブ）**
```typescript
// 変更前
className={`min-h-[100px] p-1.5 ...`}

// 変更後
className={`min-h-[80px] md:min-h-[100px] p-1 md:p-1.5 ...`}
```

**件数バッジ（モバイルで非表示）**
```typescript
// 変更前
<Badge variant="secondary" className="text-[10px] ...">

// 変更後
<Badge variant="secondary" className="hidden md:inline-flex text-[10px] ...">
```

**予約カード（時刻のみモバイル表示）**
```typescript
// 変更前
<span className="font-medium text-xs truncate">
  {booking.customerName}
</span>

// 変更後
<span className="font-medium text-xs truncate hidden md:inline">
  {booking.customerName}
</span>
```

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CalendarPage.tsx` | レスポンシブクラスの追加（セル高さ、バッジ表示、名前表示） |

---

## ビフォー・アフター

```text
【モバイル Before】           【モバイル After】
┌────┬────┬────┐            ┌────┬────┬────┐
│15  │16  │17  │            │15  │16  │17  │
│3件 │    │1件 │            │    │    │    │
│10:0│    │14:0│            │10: │    │14: │
│山田│    │鈴木│  ←潰れる    │13: │    │    │
│...  │    │...  │            │+1  │    │    │
└────┴────┴────┘            └────┴────┴────┘
  文字がはみ出し               スッキリ表示
```

---

## 技術詳細

### 変更箇所（CalendarPage.tsx）

**Line 270: セル高さのレスポンシブ化**
```typescript
className={`min-h-[80px] md:min-h-[100px] p-1 md:p-1.5 bg-card ...`}
```

**Line 283: 件数バッジをモバイルで非表示**
```typescript
<Badge variant="secondary" className="hidden md:inline-flex text-[10px] h-4 px-1 ...">
```

**Line 305-306: 名前をモバイルで非表示**
```typescript
<span className={`font-medium text-xs truncate hidden md:inline ...`}>
  {booking.customerName}
</span>
```

**Line 302-303: 時刻の短縮表示（オプション）**
モバイルでは `10:00` → `10:` のように分を省略することも可能

