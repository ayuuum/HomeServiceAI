
# 設定ページのフォントサイズ統一

## 問題点

設定ページ（`ProfilePage.tsx`）のタイトルとサブタイトルのスタイルが、他の管理ページと一致していません。

| 要素 | ProfilePage（現在） | 他のページ（統一基準） |
|------|---------------------|------------------------|
| タイトル (h1) | `text-3xl` | `text-lg md:text-xl` |
| サブタイトル | `mt-2`（text-smなし） | `text-sm mt-1` |

## 修正内容

```typescript
// 修正前（行631-632）
<h1 className="text-3xl font-bold">設定</h1>
<p className="text-muted-foreground mt-2">アカウント情報・組織設定の管理</p>

// 修正後
<h1 className="text-lg md:text-xl font-bold">設定</h1>
<p className="text-sm text-muted-foreground mt-1">アカウント情報・組織設定の管理</p>
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/ProfilePage.tsx` | タイトル・サブタイトルのクラス名を統一 |

## 効果

- 全管理ページで一貫したタイポグラフィ
- デザイン標準（memory: design/admin-style-standards）との整合性
