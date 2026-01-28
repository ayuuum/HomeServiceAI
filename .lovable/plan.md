

# 「今日の予約」ヘッダーのモバイル最適化

## 現状の問題

```text
【現在の問題 - モバイルで潰れる】
┌─────────────────────────────┐
│ 📅今日の   │ カレンダー   │
│ 予約 1件   │  で見る      │  ← 要素が潰れて縦や2列に
└─────────────────────────────┘
```

## 改善後のデザイン

```text
【改善後 - モバイル】
┌─────────────────────────────┐
│ 📅 今日の予約  1件          │
│              カレンダーで見る│
└─────────────────────────────┘

【改善後 - デスクトップ】
┌───────────────────────────────────────┐
│ 📅 今日の予約  1件    カレンダーで見る│
└───────────────────────────────────────┘
```

---

## 変更内容

### 1. ヘッダーレイアウトをレスポンシブ化

**問題箇所**: Lines 155-177

```typescript
// 変更前
<div className="flex items-center justify-between">
  <CardTitle className="text-lg font-semibold flex items-center gap-2">
    <Icon name="today" size={20} className="text-primary" />
    今日の予約
    <Badge variant="secondary" className="ml-2">
      {todayBookings.length}件
    </Badge>
  </CardTitle>
  <Button ... >カレンダーで見る</Button>
</div>

// 変更後
<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
  <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2 flex-wrap">
    <Icon name="today" size={18} className="text-primary shrink-0" />
    <span className="whitespace-nowrap">今日の予約</span>
    <Badge variant="secondary" className="text-xs">
      {todayBookings.length}件
    </Badge>
  </CardTitle>
  <Button ... className="text-xs md:text-sm self-start md:self-auto">
    カレンダーで見る
  </Button>
</div>
```

### 2. 主な修正ポイント

| 要素 | Before | After | 効果 |
|------|--------|-------|------|
| ヘッダーコンテナ | `flex items-center justify-between` | `flex flex-col gap-2 md:flex-row md:items-center md:justify-between` | モバイルで縦積み |
| タイトル | `text-lg` | `text-base md:text-lg` | フォントサイズ縮小 |
| タイトル内 | `flex items-center gap-2` | `flex items-center gap-2 flex-wrap` | 折り返し許可 |
| テキスト | なし | `whitespace-nowrap` | 文字の途中折れ防止 |
| アイコン | `size={20}` | `size={18} shrink-0` | 縮小防止 |
| バッジ | `ml-2` | `text-xs` | コンパクト化 |
| ボタン | なし | `self-start md:self-auto` | モバイルで左寄せ |

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CalendarPage.tsx` | 今日の予約ヘッダーのレスポンシブ化 |

---

## ビフォー・アフター

```text
【Before - モバイル320px】        【After - モバイル320px】
┌──────────────────────┐        ┌──────────────────────┐
│ 📅今  │カ   │        │        │ 📅 今日の予約  1件   │
│ 日の  │レ   │        │        │ カレンダーで見る     │
│ 予約  │ン   │        │        └──────────────────────┘
│  1件  │ダ   │        │          スッキリ整理
└──────────────────────┘        
  潰れて読めない
```

---

## 期待される改善

| 指標 | Before | After |
|------|--------|-------|
| 文字の視認性 | 潰れて縦表示 | 明瞭に横並び |
| レイアウト | 要素が重なる | 縦積みで整理 |
| タップ領域 | 不明確 | ボタン明確 |

これにより、モバイルでも「今日の予約」セクションのヘッダーが読みやすく、ボタンも押しやすくなります。

