
# 顧客管理「利用回数」カラムの表示崩れ修正

## 問題の分析

### 現状
テーブルのカラム幅が狭くなると、「利用回数」「利用総額」などのヘッダーテキストが1文字ずつ縦に改行されてしまう。

```text
【問題】
┌────┬────┬────┬────┬────┬────┬────────┐
│名前│電話│メール│住所│利 │利 │アクション│
│    │番号│     │    │用 │用 │         │
│    │    │     │    │回 │総 │         │
│    │    │     │    │数 │額 │         │
└────┴────┴────┴────┴────┴────┴────────┘
  ↑ 縦に文字が並んでしまう
```

### 原因
- `whitespace-nowrap` クラスが適用されていない
- カラム幅の指定がないため、テーブル全体で均等に縮む

## 解決策

テーブルヘッダーとセルに `whitespace-nowrap` を追加し、カラム幅を適切に制限することで、文字の縦並びを防ぎます。

```text
【改善後】
┌──────┬────────┬──────┬──────────┬───────┬──────────┬─────────┐
│ 名前 │電話番号│メール│   住所   │利用回数│利用総額  │アクション│
└──────┴────────┴──────┴──────────┴───────┴──────────┴─────────┘
  ↑ 横一列で表示
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CustomerManagement.tsx` | テーブルヘッダーとセルに `whitespace-nowrap` と最小幅を追加 |

## 変更詳細

### TableHead の修正（ヘッダー行）
```tsx
// 利用回数
<TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">
  利用回数
</TableHead>

// 利用総額
<TableHead className="text-right font-semibold text-muted-foreground h-12 px-6 whitespace-nowrap">
  利用総額
</TableHead>
```

### TableCell の修正（データ行）
```tsx
// 利用回数のセル
<TableCell className="text-right px-6 font-medium whitespace-nowrap">
  {customer.bookingCount}回
</TableCell>

// 利用総額のセル
<TableCell className="text-right px-6 whitespace-nowrap">
  <span className="font-bold text-foreground tabular-nums text-lg">
    ¥{customer.totalSpend?.toLocaleString()}
  </span>
</TableCell>
```

## 追加の最適化

### テーブル全体のレスポンシブ対応
テーブルコンテナに `min-w-[800px]` を追加し、横スクロールで完全なテーブルを表示できるようにします：

```tsx
<div className="hidden md:block overflow-x-auto">
  <Table className="min-w-[800px]">
    ...
  </Table>
</div>
```

## メリット
1. **視認性向上**: ヘッダーが常に横一列で表示される
2. **一貫したレイアウト**: 画面幅に関わらず読みやすい表形式を維持
3. **横スクロール対応**: 狭い画面でもテーブル全体を確認可能
