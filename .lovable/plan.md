
# 設定ページのフォントサイズ統一（網羅的修正）

## 発見した問題点

### ProfilePage.tsx
| 箇所 | 行番号 | 現状 | 修正内容 |
|------|--------|------|----------|
| メールアドレス変更 | 1162 | `text-base` なし | `text-base` を追加 |

### LineSettingsForm.tsx
| 箇所 | 行番号 | 現状 | 修正内容 |
|------|--------|------|----------|
| LINE連携設定（CardTitle） | 227 | `text-base` なし | `text-base` を追加 |
| リマインダー設定（h3） | 354 | `font-semibold` のみ | `text-sm font-semibold` に変更 |
| AI自動応答（h3） | 396 | `font-semibold` のみ | `text-sm font-semibold` に変更 |

## 修正詳細

### 1. ProfilePage.tsx（メールアドレス変更）

```typescript
// 修正前（行1162）
<CardTitle className="flex items-center gap-2">
  <Icon name="mail" size={20} />
  メールアドレス変更
</CardTitle>

// 修正後
<CardTitle className="text-base flex items-center gap-2">
  <Icon name="mail" size={20} />
  メールアドレス変更
</CardTitle>
```

### 2. LineSettingsForm.tsx（LINE連携設定）

```typescript
// 修正前（行227）
<CardTitle className="flex items-center gap-2">
  <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center">
    <Icon name="chat" size={18} className="text-white" />
  </div>
  LINE連携設定
</CardTitle>

// 修正後
<CardTitle className="text-base flex items-center gap-2">
  <div className="w-6 h-6 rounded-lg bg-[#06C755] flex items-center justify-center">
    <Icon name="chat" size={14} className="text-white" />
  </div>
  LINE連携設定
</CardTitle>
```

### 3. LineSettingsForm.tsx（セクション見出し）

```typescript
// 修正前（行354）
<h3 className="font-semibold">リマインダー設定</h3>

// 修正後
<h3 className="text-sm font-semibold">リマインダー設定</h3>

// 修正前（行396）
<h3 className="font-semibold">AI自動応答</h3>

// 修正後
<h3 className="text-sm font-semibold">AI自動応答</h3>
```

アイコンサイズも調整：
- リマインダー設定のアイコン: `size={20}` → `size={16}`
- AI自動応答のアイコン: `h-5 w-5` → `h-4 w-4`

## 修正対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/ProfilePage.tsx` | メールアドレス変更の CardTitle に `text-base` 追加 |
| `src/components/LineSettingsForm.tsx` | CardTitle に `text-base` 追加、セクション見出しを `text-sm` に統一、アイコンサイズ調整 |

## 効果

- 設定ページ全体でフォントサイズが統一
- 他の管理ページ（ダッシュボード、顧客管理等）との視覚的一貫性が確保
