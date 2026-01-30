
# 設定ページのカードタイトルサイズ統一

## 問題点

ProfilePage.tsx の CardTitle がデフォルトの `text-2xl`（24px）を使用しているため、他の管理ページ（AdminDashboardでは `text-base`）より大きく表示されている。

| 要素 | 現状 | 統一基準 |
|------|------|----------|
| CardTitle | text-2xl (24px) | text-base (16px) |

## 修正対象

ProfilePage.tsx 内の全ての CardTitle に `text-base` を追加：

1. 予約ページQRコード（行659）
2. ブランディング設定（行743）
3. 組織設定
4. プロフィール情報
5. パスワード変更
6. メールアドレス変更

## 修正例

```typescript
// 修正前
<CardTitle className="flex items-center gap-2">
  <Icon name="qr_code" size={24} />
  予約ページQRコード
</CardTitle>

// 修正後
<CardTitle className="text-base flex items-center gap-2">
  <Icon name="qr_code" size={20} />
  予約ページQRコード
</CardTitle>
```

アイコンサイズも24pxから20pxに縮小して、テキストとのバランスを調整します。

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/ProfilePage.tsx` | 全CardTitleに `text-base` を追加、アイコンサイズを調整 |
