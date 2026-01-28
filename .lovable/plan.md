
# 管理画面モバイル最適化 総合プラン

## 現状の問題点

スクリーンショットと各ページの分析から、以下の問題が確認されました：

| ページ | 問題点 |
|--------|--------|
| **CalendarPage** | ヘッダー部分の日付ナビ・タイトルが窮屈、グラフのラベル重複 |
| **CustomerManagement** | テーブルがモバイルで横スクロール必須、ボタン群が潰れる |
| **ReportsPage** | グラフのX軸ラベルが重なる、カードが縦に長すぎる |
| **BroadcastPage** | フィルタ入力欄が横並びで潰れる、履歴テーブルがはみ出す |
| **ProfilePage** | フォームが長すぎてスクロール量が多い、QRセクションが潰れる |
| **AdminDashboard** | 統計カードの数字が大きすぎる、フィルタが横並びで潰れる |

---

## 改善内容（全8ファイル）

### 1. CalendarPage.tsx - ヘッダー最適化

**問題**: 日付ナビゲーションとタイトルが横並びでモバイルで潰れる

```text
【Before】                        【After】
┌──────────────────────────┐     ┌──────────────────────────┐
│ 予約管理  < 2026年1月 > 今日│     │ 予約管理                 │
│ 予約の確認・承認...        │     │ 予約の確認・承認...       │
└──────────────────────────┘     │ ┌────────────────────┐  │
   横並びで潰れる                  │ │ < 2026年1月 > 今日 │  │
                                 │ └────────────────────┘  │
                                 └──────────────────────────┘
                                    縦積みでスッキリ
```

**変更内容**:
- ヘッダーをモバイルで縦積み（`flex-col`）に変更
- タイトルサイズを `text-xl md:text-2xl` に調整
- 月ナビを `w-full justify-center` で中央配置

---

### 2. CustomerManagement.tsx - カード形式化

**問題**: テーブルがモバイルで横スクロール必須、アクションボタンが見づらい

```text
【Before - テーブル】              【After - カード】
┌───┬───┬───┬───┬───┬───┐        ┌─────────────────────────┐
│名前│電話│..│..│..│Act│  ←横長  │ 山田太郎               │
└───┴───┴───┴───┴───┴───┘        │ 📞 090-xxx  📧 xxx@... │
                                 │ 利用: 5回  合計: ¥50,000│
                                 │ [履歴] [編集] [削除]    │
                                 └─────────────────────────┘
```

**変更内容**:
- モバイル専用カードレイアウト追加（`md:hidden`）
- デスクトップはテーブル維持（`hidden md:table`）
- ツールバーのボタンをモバイルでアイコンのみ化

---

### 3. ReportsPage.tsx - グラフ最適化

**問題**: X軸ラベルが重なる、ツールチップが見切れる

**変更内容**:
- グラフ高さを `h-[250px] md:h-[350px]` でレスポンシブ化
- X軸ラベルを間引き表示（`interval="preserveStartEnd"`）
- 期間選択を `w-full md:w-[180px]` でフル幅対応
- グラフカードを `col-span-1` で縦積み化

---

### 4. BroadcastPage.tsx - フォーム最適化

**問題**: フィルタ入力が横並びで入力しづらい

```text
【Before】                        【After】
┌─────┬────────────────────┐     ┌──────────────────────────┐
│最小│ [____] 〜 [____] 回│     │ 予約回数                 │
└─────┴────────────────────┘     │ [____] 〜 [____]        │
  潰れて入力困難                  │                          │
                                 │ 利用総額                 │
                                 │ [____] 〜 [____] 円     │
                                 └──────────────────────────┘
```

**変更内容**:
- フィルタ入力を `flex-wrap` で折り返し対応
- 入力フィールド幅を `w-full md:w-28` でフル幅化
- 履歴テーブルをモバイルでカード形式に変換

---

### 5. ProfilePage.tsx - セクション折りたたみ

**問題**: 縦に長すぎてスクロール量が多い

**変更内容**:
- QRセクションのレイアウトをモバイルで縦積み化
- ボタンを `flex flex-col md:flex-row gap-2` で縦並び
- フォームセクションを `Collapsible` でアコーディオン化検討
- カードpadding を `p-4 md:p-6` に削減

---

### 6. AdminDashboard.tsx - 統計カード最適化

**問題**: 統計数字が大きすぎ、フィルタが横並び

```text
【Before】                        【After】
┌────────────────────────────┐   ┌────────────────────────────┐
│ 今月の売上                 │   │ 今月の売上                 │
│ ¥1,234,567                 │   │ ¥1,234,567                 │
│   ←4xlで大きすぎる          │   │   ←2xl/3xlでコンパクト      │
└────────────────────────────┘   └────────────────────────────┘
```

**変更内容**:
- 統計数字を `text-2xl md:text-4xl` にスケールダウン
- フィルタを `flex-col md:flex-row` で縦積み
- 予約URLカードのボタンを `flex-col` で縦並び

---

### 7. AdminServiceManagement.tsx - カードグリッド最適化

**問題**: サービスカードのボタンが小さい

**変更内容**:
- カード画像高さを `h-32 md:h-48` に縮小
- 価格表示を `text-xl md:text-2xl` にスケールダウン
- アクションボタンを `grid-cols-2` でシンプル化

---

### 8. 共通モーダル最適化

**対象**: ServiceFormModal, ServiceOptionsModal, NewBookingModal, BookingEditModal

**変更内容**:
- モーダル幅を `max-w-full md:max-w-[500px]` でフルスクリーン対応
- フォームpadding を `p-4 md:p-6` に削減
- ボタンを `flex-col md:flex-row` で縦積み化

---

## 変更ファイル一覧

| # | ファイル | 主な変更内容 |
|---|----------|-------------|
| 1 | `src/pages/CalendarPage.tsx` | ヘッダー縦積み、日付ナビ中央配置 |
| 2 | `src/pages/CustomerManagement.tsx` | テーブル→カード変換、ツールバー最適化 |
| 3 | `src/pages/ReportsPage.tsx` | グラフ高さ調整、X軸ラベル間引き |
| 4 | `src/pages/BroadcastPage.tsx` | フィルタ縦積み、履歴カード化 |
| 5 | `src/pages/ProfilePage.tsx` | QRセクション縦積み、ボタン縦並び |
| 6 | `src/pages/AdminDashboard.tsx` | 統計数字スケールダウン、フィルタ縦積み |
| 7 | `src/pages/AdminServiceManagement.tsx` | カード画像縮小、価格スケールダウン |
| 8 | `src/components/ServiceFormModal.tsx` | フルスクリーン対応、padding削減 |

---

## 技術詳細

### CalendarPage.tsx (Lines 127-150)
```typescript
// ヘッダー: 縦積み対応
<div className="flex flex-col gap-4 mb-6">
  <div>
    <h1 className="text-xl md:text-2xl font-bold">予約管理</h1>
    <p className="text-muted-foreground text-sm mt-1">...</p>
  </div>
  <div className="flex items-center justify-center gap-2 bg-card p-1 rounded-lg ...">
    ...日付ナビ...
  </div>
</div>
```

### CustomerManagement.tsx (Lines 312-406)
```typescript
{/* Mobile Card Layout */}
<div className="md:hidden divide-y">
  {filteredCustomers.map((customer) => (
    <div key={customer.id} className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{customer.name}</p>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">¥{customer.totalSpend?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{customer.bookingCount}回</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          <Icon name="history" size={14} className="mr-1" />履歴
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <Icon name="edit" size={14} className="mr-1" />編集
        </Button>
      </div>
    </div>
  ))}
</div>

{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
  <Table>...</Table>
</div>
```

### ReportsPage.tsx (Lines 150-180)
```typescript
// グラフコンテナ
<ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 250 : 350}>
  <LineChart data={salesData}>
    <XAxis
      dataKey="date"
      interval="preserveStartEnd"
      tick={{ fontSize: 10 }}
    />
    ...
  </LineChart>
</ResponsiveContainer>

// 期間選択
<Select ...>
  <SelectTrigger className="w-full md:w-[180px]">
    ...
  </SelectTrigger>
</Select>
```

### BroadcastPage.tsx (Lines 316-400)
```typescript
// フィルタ入力 - 縦積み
<div className="space-y-4">
  <div>
    <Label>予約回数</Label>
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <Input className="w-full md:w-28" ... />
      <span>〜</span>
      <Input className="w-full md:w-28" ... />
    </div>
  </div>
</div>
```

### AdminDashboard.tsx (Lines 203-230)
```typescript
// フィルタ: 縦積み
<div className="flex flex-col md:flex-row gap-4 mb-6">
  <div className="w-full md:w-[200px]">
    <Select ...>...</Select>
  </div>
  <div className="w-full md:w-[200px]">
    <Select ...>...</Select>
  </div>
</div>

// 統計カード数字: スケールダウン
<p className="text-2xl md:text-4xl font-bold">
  ¥{totalRevenue.toLocaleString()}
</p>
```

---

## 期待される改善

| 指標 | Before | After |
|------|--------|-------|
| モバイル横スクロール | 必須（テーブル） | 不要（カード化） |
| タップターゲット | 小さい | 最小44px確保 |
| 視認性 | 情報が潰れる | 優先度順に整理 |
| スクロール量 | 多い | 最小化 |

これにより、すべての管理画面がスマートフォンでも快適に操作できるようになります。
