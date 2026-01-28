
# ページタイトルのサイズ統一・最適化

## 現状分析
各管理ページのタイトル（h1）のフォントサイズが不統一で、特にモバイルでは大きすぎる印象があります。

| ページ | タイトル | 現在のスタイル |
|--------|----------|----------------|
| CalendarPage | 予約管理 | `text-xl md:text-2xl` |
| AdminDashboard | 管理ダッシュボード | `text-2xl`（固定） |
| ReportsPage | 経営ダッシュボード | `text-xl md:text-2xl` |
| CustomerManagement | 顧客管理 | `text-2xl`（固定） |
| InboxPage | 受信トレイ | `text-2xl`（固定） |
| BroadcastPage | 一斉配信 | `text-2xl`（固定） |

## 改善方針
全ページのタイトルをレスポンシブ対応に統一し、モバイルではよりコンパクトに表示します。

### 推奨サイズ
- **モバイル**: `text-lg`（18px）- コンパクトで読みやすい
- **デスクトップ**: `text-xl`（20px）- 適度な存在感

### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/AdminDashboard.tsx` | `text-2xl` → `text-lg md:text-xl` |
| `src/pages/CalendarPage.tsx` | `text-xl md:text-2xl` → `text-lg md:text-xl` |
| `src/pages/ReportsPage.tsx` | `text-xl md:text-2xl` → `text-lg md:text-xl` |
| `src/pages/CustomerManagement.tsx` | `text-2xl` → `text-lg md:text-xl` |
| `src/pages/InboxPage.tsx` | `text-2xl` → `text-lg md:text-xl` |
| `src/pages/BroadcastPage.tsx` | `text-2xl` → `text-lg md:text-xl` |

## 視覚的な比較

```text
【現在】モバイル
┌─────────────────────────────────┐
│ 管理ダッシュボード              │  ← text-2xl（24px）大きい
│ 予約とサービスを一元管理        │
└─────────────────────────────────┘

【改善後】モバイル
┌─────────────────────────────────┐
│ 管理ダッシュボード              │  ← text-lg（18px）コンパクト
│ 予約とサービスを一元管理        │
└─────────────────────────────────┘
```

## 技術詳細

### 各ファイルの変更箇所

**AdminDashboard.tsx（188行目）**
```tsx
// Before
<h1 className="text-2xl font-bold">管理ダッシュボード</h1>

// After
<h1 className="text-lg md:text-xl font-bold">管理ダッシュボード</h1>
```

**CalendarPage.tsx（134行目）**
```tsx
// Before
<h1 className="text-xl md:text-2xl font-bold text-foreground">予約管理</h1>

// After
<h1 className="text-lg md:text-xl font-bold text-foreground">予約管理</h1>
```

**ReportsPage.tsx（129行目）**
```tsx
// Before
<h1 className="text-xl md:text-2xl font-bold">経営ダッシュボード</h1>

// After
<h1 className="text-lg md:text-xl font-bold">経営ダッシュボード</h1>
```

**CustomerManagement.tsx（265行目）**
```tsx
// Before
<h1 className="text-2xl font-bold text-foreground">顧客管理</h1>

// After
<h1 className="text-lg md:text-xl font-bold text-foreground">顧客管理</h1>
```

**InboxPage.tsx（54行目）**
```tsx
// Before
<h1 className="text-2xl font-bold">受信トレイ</h1>

// After
<h1 className="text-lg md:text-xl font-bold">受信トレイ</h1>
```

**BroadcastPage.tsx（269行目）**
```tsx
// Before
<h1 className="text-2xl font-bold flex items-center gap-2">

// After
<h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
```

## メリット
1. **統一感**: 全ページで同じサイズ感になり、デザインの一貫性が向上
2. **モバイル最適化**: 小さな画面でもバランスの良い表示
3. **視認性維持**: デスクトップでは`text-xl`で十分な存在感を保持
4. **メンテナンス性**: 統一ルールにより将来の変更が容易

## 実装の安全性
- 純粋なスタイル変更のため、ロジックへの影響なし
- 既存のレスポンシブデザインパターンを踏襲
