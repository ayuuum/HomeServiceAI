
# 顧客管理画面 モバイルボタンサイズの最適化

## 問題の分析

### 現状
3つのアクションボタンがモバイルで大きすぎる：
- **新規顧客登録**: `h-12 px-6 w-full`
- **データ同期**: `h-12 px-6 w-full`
- **CSVエクスポート**: `h-12 px-6 w-full`

```text
【現状】モバイル表示
┌────────────────────────────────────┐
│  ＋ 新規顧客登録                    │ ← h-12 (48px) で大きい
├────────────────────────────────────┤
│  ⟳ データ同期                       │ ← h-12 (48px) で大きい
├────────────────────────────────────┤
│  ↓ CSVエクスポート                  │ ← h-12 (48px) で大きい
└────────────────────────────────────┘
```

## 解決策

モバイルではボタンサイズを `h-10`（40px）に縮小し、横並び2列レイアウトに変更してスペース効率を向上させます。

```text
【改善後】モバイル表示
┌─────────────────┬─────────────────┐
│ ＋ 新規顧客登録  │  ⟳ データ同期   │ ← h-10 (40px) でコンパクト
├─────────────────┴─────────────────┤
│        ↓ CSVエクスポート          │
└───────────────────────────────────┘
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/CustomerManagement.tsx` | ボタンのレスポンシブサイズ調整とレイアウト変更 |

## 変更詳細

### ボタンサイズの調整
```tsx
// 新規顧客登録ボタン
<Button 
  onClick={handleAdd} 
  className="w-full sm:w-auto btn-primary shadow-subtle h-10 sm:h-12 px-4 sm:px-6 text-sm"
>
  <Icon name="add" size={18} className="mr-1.5" />
  新規顧客登録
</Button>

// データ同期ボタン
<Button 
  onClick={fixMissingCustomers} 
  variant="outline" 
  className="w-full sm:w-auto h-10 sm:h-12 px-4 sm:px-6 text-sm" 
  disabled={isFixing}
>
  <Icon name="sync" size={14} className={`mr-1.5 ${isFixing ? "animate-spin" : ""}`} />
  データ同期
</Button>

// CSVエクスポートボタン
<Button
  variant="outline"
  className="w-full sm:w-auto h-10 sm:h-12 px-4 sm:px-6 text-sm"
  ...
>
  <Icon name="download" size={14} className="mr-1.5" />
  CSVエクスポート
</Button>
```

### コンテナレイアウトの調整
```tsx
// ボタンコンテナを2列グリッドに
<div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
  {/* 新規顧客登録 - 1列目 */}
  <Button className="col-span-1 ...">新規顧客登録</Button>
  
  {/* データ同期 - 2列目 */}
  <Button className="col-span-1 ...">データ同期</Button>
  
  {/* CSVエクスポート - 2列にまたがる */}
  <Button className="col-span-2 sm:col-span-1 ...">CSVエクスポート</Button>
</div>
```

## サイズ比較

| 要素 | 変更前（モバイル） | 変更後（モバイル） | デスクトップ |
|------|-------------------|-------------------|-------------|
| ボタン高さ | 48px (h-12) | 40px (h-10) | 48px (h-12) |
| 横パディング | 24px (px-6) | 16px (px-4) | 24px (px-6) |
| アイコンサイズ | 16-20px | 14-18px | 16-20px |
| レイアウト | 縦並び | 2列グリッド | 横並び |

## メリット
1. **スペース効率向上**: 縦方向のスペースを約40%削減
2. **視覚的バランス**: 他のUI要素との調和
3. **タップターゲット維持**: 40pxは十分なタップサイズ（推奨44px以上だが許容範囲内）
4. **デスクトップ影響なし**: sm以上では従来サイズを維持
