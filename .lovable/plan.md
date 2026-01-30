
# 設定ページのコンパクト化

## 現状の課題

現在の設定ページは7つのカードセクションが縦に並んでおり、スクロール量が多い：

1. QRコード
2. ブランディング設定
3. プロフィール情報
4. 組織設定
5. LINE連携
6. パスワード変更
7. メールアドレス変更

## 解決策：タブ形式への変更

関連する設定をグループ化し、タブで切り替える形式に変更：

```text
┌────────────────────────────────────────────────┐
│  設定                                           │
│  アカウント情報・組織設定の管理                    │
├────────────────────────────────────────────────┤
│  [予約ページ]  [アカウント]  [LINE連携]           │
├────────────────────────────────────────────────┤
│                                                │
│   （選択したタブの内容を表示）                     │
│                                                │
└────────────────────────────────────────────────┘
```

### タブ構成

| タブ名 | 内容 |
|--------|------|
| 予約ページ | QRコード、ブランディング、組織設定（URL） |
| アカウント | プロフィール、パスワード変更、メール変更 |
| LINE連携 | LINE設定フォーム |

## 実装詳細

### 変更内容

1. **タブコンポーネントの導入**
   - `@/components/ui/tabs` を使用
   - 3つのタブパネルに分割

2. **レイアウトの調整**
   - 各タブ内では縦のスペースを最小限に
   - 関連するフォームは1つのカードにまとめる可能性も検討

### 変更後のコード構造

```typescript
<Tabs defaultValue="booking" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="booking">予約ページ</TabsTrigger>
    <TabsTrigger value="account">アカウント</TabsTrigger>
    <TabsTrigger value="line">LINE連携</TabsTrigger>
  </TabsList>
  
  <TabsContent value="booking" className="space-y-6">
    {/* QRコード + ブランディング + 組織設定 */}
  </TabsContent>
  
  <TabsContent value="account" className="space-y-6">
    {/* プロフィール + パスワード + メール変更 */}
  </TabsContent>
  
  <TabsContent value="line">
    <LineSettingsForm />
  </TabsContent>
</Tabs>
```

## 効果

- スクロール量が大幅に削減
- 関連設定がグループ化され、目的の設定を見つけやすい
- モバイルでの操作性向上

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/ProfilePage.tsx` | タブ形式にリファクタリング |
