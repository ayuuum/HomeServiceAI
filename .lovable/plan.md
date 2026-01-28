
# 予約詳細モーダルのモバイル最適化

## 問題点

1. **予約ID表示**: UUIDが36文字で長すぎ、実用性が低い
2. **全体的なサイズ**: フォントサイズ、padding、ボタンがモバイルには大きすぎる

## 改善内容

### 1. 予約IDの非表示

予約IDは管理者が日常的に参照するものではなく、技術的な識別子。削除してUIをスッキリさせる。

```text
【Before】                     【After】
┌─────────────────────┐       ┌─────────────────────┐
│ 予約詳細            │       │ 予約詳細            │
│ 予約ID: a1b2c3d4-...│       │                     │
│                     │       │ ステータス: 確定済み │
└─────────────────────┘       └─────────────────────┘
```

### 2. レスポンシブ対応

**モバイル（〜767px）向け最適化:**
- タイトル: `text-2xl` → `text-lg md:text-2xl`
- セクションpadding: `p-4` → `p-3 md:p-4`
- 料金表示: `text-3xl` → `text-2xl md:text-3xl`
- ボタン高さ: `h-12` → `h-10 md:h-12`
- ラベル幅: `w-24` → `w-20 md:w-24`

### 3. コンパクトレイアウト

```text
【モバイル Before】          【モバイル After】
┌────────────────────┐      ┌────────────────────┐
│ 予約詳細           │      │ 予約詳細           │
│ 予約ID: a1b2c3... │      │                    │
│                    │      │ ステータス: 確定   │
│ ステータス:        │      ├────────────────────┤
│   ┌─────────────┐  │      │ 📋 サービス内容    │
│   │ ✓ 確定済み  │  │      │ ┌────────────────┐ │
│   └─────────────┘  │      │ │エアコンクリーニング│
├────────────────────┤      │ │・室外機         │
│ 📋 サービス内容    │      │ └────────────────┘ │
│ ┌────────────────┐ │      ├────────────────────┤
│ │                │ │      │ 👤 お客様情報      │
│ │  エアコン      │ │      │ ┌────────────────┐ │
│ │  クリーニング  │ │      │ │名前: 山田太郎  │ │
│ │                │ │      │ │電話: 090-xxx   │ │
│ │ 選択オプション: │ │      │ └────────────────┘ │
│ │ ・室外機       │ │      ├────────────────────┤
│ └────────────────┘ │      │ 合計: ¥15,000    │
│                    │      └────────────────────┘
│（以下続く...）     │        約30%コンパクト化
└────────────────────┘
```

---

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/BookingDetailModal.tsx` | 予約ID削除、レスポンシブクラス追加 |

---

## 技術詳細

### Line 98: DialogContentのレスポンシブ化
```typescript
// 変更前
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

// 変更後
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
```

### Lines 99-104: タイトル・予約ID削除
```typescript
// 変更前
<DialogHeader>
  <DialogTitle className="text-2xl">予約詳細</DialogTitle>
  <DialogDescription>
    予約ID: {booking.id}
  </DialogDescription>
</DialogHeader>

// 変更後
<DialogHeader>
  <DialogTitle className="text-lg md:text-2xl">予約詳細</DialogTitle>
</DialogHeader>
```

### Lines 134-138: セクションpadding削減
```typescript
// 変更前
<div className="bg-muted/50 p-4 rounded-lg space-y-2">

// 変更後
<div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-2">
```

### Lines 164-166: ラベル幅のレスポンシブ化
```typescript
// 変更前
<span className="text-sm text-muted-foreground w-24">

// 変更後
<span className="text-sm text-muted-foreground w-20 md:w-24 flex-shrink-0">
```

### Lines 281-289: 料金表示のコンパクト化
```typescript
// 変更前
<p className="text-3xl font-bold text-primary">

// 変更後
<p className="text-2xl md:text-3xl font-bold text-primary">
```

### Lines 304-329: ボタンのレスポンシブ化
```typescript
// 変更前
<Button className="flex-1 btn-primary h-12">
<Button className="flex-1 h-11">

// 変更後
<Button className="flex-1 btn-primary h-10 md:h-12 text-sm md:text-base">
<Button className="flex-1 h-9 md:h-11 text-xs md:text-sm">
```

---

## 期待される改善

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| ヘッダー高さ | 約80px | 約48px | 40%削減 |
| セクションpadding | 16px | 12px (モバイル) | 25%削減 |
| ボタン高さ | 48px | 40px (モバイル) | 17%削減 |
| 予約ID表示 | あり | なし | 完全削除 |

これにより、モバイルでの予約詳細表示がコンパクトになり、スクロール量が減って見やすくなります。
