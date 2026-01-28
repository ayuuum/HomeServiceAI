
# 管理画面パディング・マージン最適化 & サブタイトル統一

## 概要
管理画面全体のパディング・マージンをモバイル向けに最適化し、サブタイトル（説明文）のフォントサイズを全ページで統一します。

## 現状の問題点

### パディング・マージンの不統一
- `py-8`（AdminDashboard）、`py-6`（Calendar/Reports/Customer）、`py-4`（Inbox/Broadcast）とバラバラ
- モバイルではpy-8は余白が大きすぎる

### サブタイトルサイズの不統一
- 一部は `text-sm`、一部は指定なし（デフォルトのtext-base）
- mt-1 の間隔は統一されている

## 改善方針

### 1. パディングの統一
- **モバイル**: `py-4`（コンパクト）
- **デスクトップ**: `py-6`（適度な余白）
- 形式: `py-4 md:py-6`

### 2. サブタイトルの統一
- **統一スタイル**: `text-sm text-muted-foreground mt-1`
- 全ページでtext-smを適用してコンパクトに

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/AdminDashboard.tsx` | `py-8` → `py-4 md:py-6` |
| `src/pages/CalendarPage.tsx` | `py-6` → `py-4 md:py-6`（変更小） |
| `src/pages/ReportsPage.tsx` | `py-6` → `py-4 md:py-6`（変更小） |
| `src/pages/CustomerManagement.tsx` | `py-6` → `py-4 md:py-6`、サブタイトルに`text-sm`追加 |
| `src/pages/InboxPage.tsx` | サブタイトルに`text-sm`追加 |
| `src/pages/BroadcastPage.tsx` | サブタイトルに`text-sm`追加 |

## 変更詳細

### AdminDashboard.tsx
```tsx
// Line 185: py-8 → py-4 md:py-6
<section className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
```

### CalendarPage.tsx
```tsx
// Line 130: py-6 → py-4 md:py-6
<div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
```

### ReportsPage.tsx
```tsx
// Line 126: py-6 → py-4 md:py-6
<div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
```

### CustomerManagement.tsx
```tsx
// Line 263: py-6 → py-4 md:py-6
<div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">

// Line 266: サブタイトルにtext-sm追加
<p className="text-sm text-muted-foreground mt-1">顧客情報を一覧で管理できます</p>
```

### InboxPage.tsx
```tsx
// Line 55: サブタイトルにtext-sm追加
<p className="text-sm text-muted-foreground mt-1">LINEメッセージの確認・返信ができます</p>
```

### BroadcastPage.tsx
```tsx
// Line 274: サブタイトルにtext-sm追加
<p className="text-sm text-muted-foreground mt-1">
    セグメントを指定してLINE連携済みの顧客にメッセージを一斉送信します
</p>
```

## 視覚的な比較

```text
【現在】モバイル
┌─────────────────────────────────┐
│                                 │ ← py-8 (32px) 余白大きい
│ 管理ダッシュボード              │
│ 予約とサービスを一元管理        │ ← text-base (16px)
│                                 │
└─────────────────────────────────┘

【改善後】モバイル
┌─────────────────────────────────┐
│ 管理ダッシュボード              │ ← py-4 (16px) コンパクト
│ 予約とサービスを一元管理        │ ← text-sm (14px) 統一
│                                 │
└─────────────────────────────────┘
```

## 統一後の基準スタイル

```tsx
// ページヘッダー部分の統一パターン
<div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
  <h1 className="text-lg md:text-xl font-bold">ページタイトル</h1>
  <p className="text-sm text-muted-foreground mt-1">サブタイトル説明文</p>
</div>
```

## メリット
1. **統一感**: 全ページで同じ余白・フォントサイズ
2. **モバイル最適化**: 画面スペースを効率的に使用
3. **視認性維持**: デスクトップでは適度な余白を確保
4. **メンテナンス性**: 統一ルールにより将来の変更が容易

## 実装の安全性
- 純粋なスタイル変更のため、ロジックへの影響なし
- 既存のレスポンシブデザインパターンを踏襲
